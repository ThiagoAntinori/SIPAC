using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SIPAC.API.Services;

public class NotificacionService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificacionService> _logger;

    public NotificacionService(IConfiguration configuration, ILogger<NotificacionService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public Task SendAlertAsync(string destinatario, string asunto, string mensaje)
    {
        _logger.LogInformation("[Notificacion] Alerta enviada a {Destinatario}: {Asunto} - {Mensaje}", destinatario, asunto, mensaje);
        return Task.CompletedTask;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var smtpHost = Environment.GetEnvironmentVariable("NOTIFICATIONS__EMAIL__SMTPHOST")
            ?? _configuration["Notifications:Email:SmtpHost"]
            ?? "smtp.gmail.com";

        var smtpPortStr = Environment.GetEnvironmentVariable("NOTIFICATIONS__EMAIL__SMTPPORT")
            ?? _configuration["Notifications:Email:SmtpPort"]
            ?? "587";

        var smtpUser = Environment.GetEnvironmentVariable("NOTIFICATIONS__EMAIL__USERNAME")
            ?? _configuration["Notifications:Email:Username"];

        var smtpPass = Environment.GetEnvironmentVariable("NOTIFICATIONS__EMAIL__PASSWORD")
            ?? _configuration["Notifications:Email:Password"];

        if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            _logger.LogWarning("[EmailService] Credenciales SMTP de Gmail no configuradas. Correo simulado para {To}: Asunto '{Subject}'", toEmail, subject);
            return true;
        }

        try
        {
            var port = int.TryParse(smtpPortStr, out var p) ? p : 587;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SITRAC Sistema", smtpUser));
            message.To.Add(new MailboxAddress(toEmail, toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("[EmailService] Correo enviado exitosamente a {To}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailService] Error al despachar correo a {To}", toEmail);
            return false;
        }
    }

    public async Task<bool> SendPinActivationEmailAsync(string toEmail, string nombreOperario, string usuario, string activationUrl)
    {
        var subject = "SITRAC - Activación de PIN de Acceso Móvil";
        var html = $@"
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset='utf-8'>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
            .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }}
            .header p {{ margin: 4px 0 0; font-size: 13px; color: #94a3b8; }}
            .content {{ padding: 28px; color: #334155; line-height: 1.6; font-size: 14px; }}
            .highlight-box {{ background-color: #f1f5f9; border-left: 4px solid #ea580c; padding: 14px; border-radius: 6px; margin: 18px 0; }}
            .btn {{ display: block; width: fit-content; margin: 24px auto; background-color: #ea580c; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; text-align: center; }}
            .footer {{ padding: 20px; background-color: #f8fafc; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; }}
          </style>
        </head>
        <body>
          <div class='card'>
            <div class='header'>
              <h1>SITRAC</h1>
              <p>Portal de Mantenimiento y Operarios</p>
            </div>
            <div class='content'>
              <p>Hola <strong>{nombreOperario}</strong>,</p>
              <p>Se ha habilitado tu cuenta para acceder al <strong>Portal Móvil de Operarios de SITRAC</strong>.</p>
              
              <div class='highlight-box'>
                <p style='margin: 0;'><strong>Tu usuario asignado:</strong> <code style='font-size: 15px; color: #ea580c;'>{usuario}</code></p>
              </div>

              <p>Para ingresar al sistema desde tu teléfono celular, debes configurar tu <strong>PIN numérico de 4 dígitos</strong> haciendo clic en el siguiente botón:</p>

              <a href='{activationUrl}' class='btn'>Activar mi PIN de Acceso</a>

              <p style='font-size: 12px; color: #64748b;'>Si el botón no funciona, copia y pega este enlace en tu navegador:<br><a href='{activationUrl}'>{activationUrl}</a></p>
              <p style='font-size: 12px; color: #94a3b8;'>Este enlace tiene una validez de 48 horas.</p>
            </div>
            <div class='footer'>
              SITRAC &copy; {DateTime.UtcNow.Year} - Sistema Integral de Trabajos y Abastecimiento para Consorcios
            </div>
          </div>
        </body>
        </html>";

        return await SendEmailAsync(toEmail, subject, html);
    }

    public async Task<bool> SendAlertaStockBajoAsync(string articuloNombre, decimal stockActual, decimal stockMinimo, string unidadMedida)
    {
        var toEmail = Environment.GetEnvironmentVariable("NOTIFICATIONS__EMAIL__TO")
            ?? _configuration["Notifications:Email:To"];

        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogInformation("[Notificacion] Alerta de stock bajo para '{Articulo}': Actual {Actual} {Unidad} (Mínimo {Minimo} {Unidad}). No hay email de destino configurado.", articuloNombre, stockActual, stockMinimo, unidadMedida);
            return false;
        }

        var subject = $"⚠️ Alerta de Stock Bajo: {articuloNombre}";
        var html = $@"
        <div style='font-family: sans-serif; padding: 20px; color: #333;'>
            <h2 style='color: #dc2626;'>⚠️ Alerta de Nivel de Stock Crítico</h2>
            <p>El artículo <strong>{articuloNombre}</strong> ha alcanzado o superado el umbral de stock mínimo:</p>
            <ul>
                <li><strong>Stock Actual:</strong> {stockActual} {unidadMedida}</li>
                <li><strong>Stock Mínimo:</strong> {stockMinimo} {unidadMedida}</li>
            </ul>
            <p>Por favor, gestione la compra o reposición en el sistema a la brevedad.</p>
        </div>";

        return await SendEmailAsync(toEmail, subject, html);
    }
}
