using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WebPush;
using SIPAC.API.Data;
using SIPAC.API.Entities;

namespace SIPAC.API.Services;

public class PushNotificationService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<PushNotificationService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    private readonly string _publicKey;
    private readonly string _privateKey;
    private readonly string _subject;

    public PushNotificationService(
        IConfiguration configuration,
        ILogger<PushNotificationService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _scopeFactory = scopeFactory;

        _publicKey = Environment.GetEnvironmentVariable("VAPID__PUBLIC_KEY")
            ?? _configuration["Vapid:PublicKey"]
            ?? "BIAln3bqQX06YkuuyZDy7oTcbrP6NLZTfw38csb7VLD6bl2nc_LSVgMjZ8WiModsrTmHPlXWsJPvgGZrx19QmDs";

        _privateKey = Environment.GetEnvironmentVariable("VAPID__PRIVATE_KEY")
            ?? _configuration["Vapid:PrivateKey"]
            ?? "VBmX2KM2fm4SXWkg76BTq3JTY_QOnkhGAbSWqh__dZE";

        _subject = Environment.GetEnvironmentVariable("VAPID__SUBJECT")
            ?? _configuration["Vapid:Subject"]
            ?? "mailto:soporte@sitrac.com";
    }

    public string GetPublicKey() => _publicKey;

    public async Task SendNotificationToResponsableAsync(Guid responsableId, string title, string body, string url = "/operario", string? tag = null)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SipacDbContext>();

            var subscriptions = await context.SuscripcionesPush
                .Where(s => s.ResponsableId == responsableId)
                .ToListAsync();

            if (!subscriptions.Any())
            {
                _logger.LogInformation("[WebPush] No hay suscripciones push registradas para el responsable {Id}", responsableId);
                return;
            }

            var payload = JsonSerializer.Serialize(new
            {
                title,
                body,
                url,
                tag = tag ?? $"ot-{Guid.NewGuid().ToString()[..8]}"
            });

            var vapidDetails = new VapidDetails(_subject, _publicKey, _privateKey);
            var webPushClient = new WebPushClient();

            var deadSubscriptions = new List<SuscripcionPush>();

            foreach (var sub in subscriptions)
            {
                try
                {
                    var pushSubscription = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                    await webPushClient.SendNotificationAsync(pushSubscription, payload, vapidDetails);
                    _logger.LogInformation("[WebPush] Notificación enviada con éxito a {Endpoint}", sub.Endpoint);
                }
                catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone || ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("[WebPush] Suscripción caducada o no encontrada (HTTP {Code}). Se eliminará.", ex.StatusCode);
                    deadSubscriptions.Add(sub);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[WebPush] Error al enviar notificación a {Endpoint}", sub.Endpoint);
                }
            }

            if (deadSubscriptions.Any())
            {
                context.SuscripcionesPush.RemoveRange(deadSubscriptions);
                await context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WebPush] Error general en SendNotificationToResponsableAsync");
        }
    }
}
