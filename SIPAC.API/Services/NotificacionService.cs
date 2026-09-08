using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SIPAC.API.Services;

public class NotificacionService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificacionService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public NotificacionService(
        IConfiguration configuration,
        ILogger<NotificacionService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public Task SendAlertAsync(string destinatario, string asunto, string mensaje)
    {
        _logger.LogInformation("[Notificacion] Alerta: Destinatario {Destinatario} - {Asunto}: {Mensaje}", destinatario, asunto, mensaje);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Envío de correo electrónico a través de la API REST de Brevo (Sendinblue) por HTTPS (puerto 443).
    /// </summary>
    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlContent, string? toName = null)
    {
        var apiKey = Environment.GetEnvironmentVariable("BREVO_API_KEY")
            ?? Environment.GetEnvironmentVariable("BREVO__API_KEY")
            ?? _configuration["Brevo:ApiKey"];

        var senderEmail = Environment.GetEnvironmentVariable("BREVO_SENDER_EMAIL")
            ?? Environment.GetEnvironmentVariable("BREVO__SENDER_EMAIL")
            ?? _configuration["Brevo:SenderEmail"];

        var senderName = Environment.GetEnvironmentVariable("BREVO_SENDER_NAME")
            ?? Environment.GetEnvironmentVariable("BREVO__SENDER_NAME")
            ?? _configuration["Brevo:SenderName"]
            ?? "SITRAC Consorcio";

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(senderEmail))
        {
            _logger.LogWarning("[Brevo] Credenciales no configuradas (BREVO_API_KEY o BREVO_SENDER_EMAIL faltantes). Correo no enviado a {To}: '{Subject}'", toEmail, subject);
            return false;
        }

        try
        {
            var payload = new
            {
                sender = new
                {
                    name = senderName,
                    email = senderEmail.Trim()
                },
                to = new[]
                {
                    new
                    {
                        email = toEmail.Trim(),
                        name = !string.IsNullOrWhiteSpace(toName) ? toName.Trim() : toEmail.Trim()
                    }
                },
                subject = subject,
                htmlContent = htmlContent
            };

            var client = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
            request.Headers.Add("api-key", apiKey.Trim());
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            var response = await client.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[Brevo] Correo enviado exitosamente a {To}. Código: {StatusCode}, Respuesta: {Body}", toEmail, (int)response.StatusCode, responseBody);
                return true;
            }
            else
            {
                _logger.LogError("[Brevo] Error ({StatusCode}) al enviar correo a {To}. Respuesta: {Body}", (int)response.StatusCode, toEmail, responseBody);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Brevo] Excepción de red al enviar correo vía API REST a {To}", toEmail);
            return false;
        }
    }

    /// <summary>
    /// Notificación de habilitación de acceso al Portal Móvil y activación de PIN para Operarios.
    /// </summary>
    public async Task<bool> SendPinActivationEmailAsync(string toEmail, string nombreOperario, string usuario, string activationUrl)
    {
        var subject = "SITRAC - Activación de cuenta y configuración de PIN";
        var usuarioDisplay = usuario.StartsWith("@") ? usuario : $"@{usuario}";
        var htmlContent = $@"
        <!DOCTYPE html>
        <html lang='es'>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>{subject}</title>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }}
            .container {{ max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ background-color: #0f172a; padding: 24px 32px; text-align: left; border-bottom: 3px solid #ea580c; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }}
            .header p {{ margin: 4px 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }}
            .body {{ padding: 32px; font-size: 14px; line-height: 1.6; color: #334155; }}
            .greeting {{ font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }}
            .credentials-box {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #ea580c; border-radius: 6px; padding: 16px; margin: 20px 0; }}
            .credentials-box p {{ margin: 0; font-size: 13px; }}
            .credentials-box strong {{ color: #0f172a; }}
            .user-badge {{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 700; color: #c2410c; background-color: #ffedd5; padding: 2px 8px; border-radius: 4px; border: 1px solid #fed7aa; }}
            .button-wrapper {{ text-align: center; margin: 28px 0; }}
            .btn {{ display: inline-block; background-color: #ea580c; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.2); }}
            .notice {{ font-size: 12px; color: #64748b; background-color: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 24px; border: 1px dashed #cbd5e1; }}
            .footer {{ background-color: #f8fafc; padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class='container'>
            <div class='header'>
              <h1>SITRAC</h1>
              <p>Sistema Integral de Trabajos, Abastecimiento y Consorcios</p>
            </div>
            <div class='body'>
              <p class='greeting'>Hola {nombreOperario},</p>
              <p>Se ha habilitado tu acceso como operario en el sistema de gestión y mantenimiento <strong>SITRAC</strong>.</p>
              
              <div class='credentials-box'>
                <p><strong>Tu usuario asignado:</strong> <span class='user-badge'>{usuarioDisplay}</span></p>
              </div>

              <p>Para ingresar desde tu teléfono celular u ordenador, debes activar tu cuenta y configurar tu <strong>PIN numérico de 4 dígitos</strong>:</p>

              <div class='button-wrapper'>
                <a href='{activationUrl}' class='btn' target='_blank'>Configurar mi PIN de 4 dígitos</a>
              </div>

              <div class='notice'>
                <p style='margin: 0 0 6px 0;'><strong>⚠️ Validez limitada:</strong> Por razones de seguridad, este enlace es válido únicamente por <strong>48 horas</strong>.</p>
                <p style='margin: 0; word-break: break-all;'>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br><a href='{activationUrl}' style='color: #ea580c;'>{activationUrl}</a></p>
              </div>
            </div>
            <div class='footer'>
              SITRAC &copy; {DateTime.UtcNow.Year} - Sistema Integral de Trabajos, Abastecimiento y Consorcios.<br>
              Este es un correo automático, por favor no respondas a este mensaje.
            </div>
          </div>
        </body>
        </html>";

        return await SendEmailAsync(toEmail, subject, htmlContent, nombreOperario);
    }

    /// <summary>
    /// Notificación de alerta cuando el stock actual cae por debajo o igual al stock mínimo.
    /// </summary>
    public async Task<bool> SendAlertaStockBajoAsync(string articuloNombre, decimal stockActual, decimal stockMinimo, string unidadMedida)
    {
        var toEmail = Environment.GetEnvironmentVariable("NOTIFICATIONS__EMAIL__TO")
            ?? _configuration["Notifications:Email:To"];

        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogInformation("[Notificacion] Alerta de stock bajo para '{Articulo}': Actual {Actual} {Unidad} (Mínimo {Minimo} {Unidad}). No hay email de destino configurado.", articuloNombre, stockActual, unidadMedida, stockMinimo, unidadMedida);
            return false;
        }

        var subject = $"⚠️ [SITRAC] Alerta de Stock Bajo: {articuloNombre}";
        var htmlContent = $@"
        <!DOCTYPE html>
        <html lang='es'>
        <head>
          <meta charset='utf-8'>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f1f5f9; padding: 24px; color: #1e293b; }}
            .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background-color: #991b1b; padding: 18px 24px; color: #ffffff; }}
            .header h2 {{ margin: 0; font-size: 18px; }}
            .header p {{ margin: 4px 0 0; font-size: 11px; color: #fecaca; text-transform: uppercase; }}
            .content {{ padding: 24px; font-size: 14px; line-height: 1.5; color: #334155; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }}
            th, td {{ padding: 10px 12px; border: 1px solid #e2e8f0; }}
            th {{ background: #f8fafc; text-align: left; color: #475569; }}
            .critical {{ color: #dc2626; font-weight: 700; }}
            .footer {{ background: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class='card'>
            <div class='header'>
              <h2>⚠️ Alerta de Stock Crítico</h2>
              <p>SITRAC - Sistema de Pañol y Abastecimiento</p>
            </div>
            <div class='content'>
              <p>El siguiente artículo ha alcanzado o superado el umbral de stock mínimo permitido:</p>
              <table>
                <tr><th>Artículo</th><td><strong>{articuloNombre}</strong></td></tr>
                <tr><th>Stock Actual</th><td class='critical'>{stockActual} {unidadMedida}</td></tr>
                <tr><th>Stock Mínimo</th><td>{stockMinimo} {unidadMedida}</td></tr>
                <tr><th>Fecha de Registro</th><td>{DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</td></tr>
              </table>
              <p style='margin-top: 18px; font-size: 13px; color: #64748b;'>Por favor, gestione la compra o reposición en el sistema a la brevedad.</p>
            </div>
            <div class='footer'>
              SITRAC &copy; {DateTime.UtcNow.Year}
            </div>
          </div>
        </body>
        </html>";

        return await SendEmailAsync(toEmail, subject, htmlContent, "Administrador SITRAC");
    }

    /// <summary>
    /// Notificación de asignación o reasignación de una Orden de Trabajo.
    /// </summary>
    public async Task<bool> SendAsignacionOrdenTrabajoAsync(
        string numeroOT,
        string responsable,
        string unidadFuncional,
        string problema,
        string? emailResponsable = null)
    {
        var toEmail = !string.IsNullOrWhiteSpace(emailResponsable)
            ? emailResponsable
            : (Environment.GetEnvironmentVariable("NOTIFICATIONS__EMAIL__TO") ?? _configuration["Notifications:Email:To"]);

        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogInformation("[Notificacion] Asignación de OT {NumeroOT} a {Responsable}. No hay email configurado.", numeroOT, responsable);
            return false;
        }

        var subject = $"📋 [SITRAC] Nueva OT Asignada: {numeroOT} — {responsable}";
        var htmlContent = $@"
        <!DOCTYPE html>
        <html lang='es'>
        <head>
          <meta charset='utf-8'>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f1f5f9; padding: 24px; color: #1e293b; }}
            .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background-color: #1e40af; padding: 18px 24px; color: #ffffff; }}
            .header h2 {{ margin: 0; font-size: 18px; }}
            .header p {{ margin: 4px 0 0; font-size: 11px; color: #bfdbfe; text-transform: uppercase; }}
            .content {{ padding: 24px; font-size: 14px; line-height: 1.5; color: #334155; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }}
            th, td {{ padding: 10px 12px; border: 1px solid #e2e8f0; }}
            th {{ background: #f8fafc; text-align: left; color: #475569; }}
            .footer {{ background: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class='card'>
            <div class='header'>
              <h2>📋 Nueva Orden de Trabajo Asignada</h2>
              <p>SITRAC - Mantenimiento y Operaciones</p>
            </div>
            <div class='content'>
              <p>Se ha registrado y asignado una nueva Orden de Trabajo con el siguiente detalle:</p>
              <table>
                <tr><th>Número de OT</th><td><strong>{numeroOT}</strong></td></tr>
                <tr><th>Responsable</th><td>{responsable}</td></tr>
                <tr><th>Unidad Funcional</th><td>{unidadFuncional}</td></tr>
                <tr><th>Problema Reportado</th><td>{problema}</td></tr>
                <tr><th>Fecha Asignación</th><td>{DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</td></tr>
              </table>
              <p style='margin-top: 18px; font-size: 13px; color: #64748b;'>Ingresá al sistema para consultar los detalles o registrar avances.</p>
            </div>
            <div class='footer'>
              SITRAC &copy; {DateTime.UtcNow.Year}
            </div>
          </div>
        </body>
        </html>";

        return await SendEmailAsync(toEmail, subject, htmlContent, responsable);
    }
}
