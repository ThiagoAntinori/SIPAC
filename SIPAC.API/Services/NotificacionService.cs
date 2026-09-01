namespace SIPAC.API.Services;

public class NotificacionService
{
    private readonly ILogger<NotificacionService> _logger;

    public NotificacionService(ILogger<NotificacionService> logger)
    {
        _logger = logger;
    }

    public Task SendAlertAsync(string destinatario, string asunto, string mensaje)
    {
        _logger.LogInformation("Notificación enviada a {Destinatario}: {Asunto} - {Mensaje}", destinatario, asunto, mensaje);
        return Task.CompletedTask;
    }
}
