using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Operarios;
using SIPAC.API.Entities;
using SIPAC.API.Services;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PushController : ControllerBase
{
    private readonly SipacDbContext _context;
    private readonly PushNotificationService _pushService;

    public PushController(SipacDbContext context, PushNotificationService pushService)
    {
        _context = context;
        _pushService = pushService;
    }

    [HttpGet("public-key")]
    public ActionResult GetPublicKey()
    {
        return Ok(new { publicKey = _pushService.GetPublicKey() });
    }

    [Authorize]
    [HttpPost("suscribir")]
    public async Task<ActionResult> Suscribir([FromBody] SuscripcionPushRequest request)
    {
        var operarioClaim = User.FindFirst("OperarioId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(operarioClaim, out var responsableId))
        {
            return BadRequest(new { message = "Solo los operarios y responsables pueden suscribir dispositivos push." });
        }

        var existente = await _context.SuscripcionesPush
            .FirstOrDefaultAsync(s => s.Endpoint == request.Endpoint);

        if (existente != null)
        {
            existente.ResponsableId = responsableId;
            existente.P256dh = request.P256dh;
            existente.Auth = request.Auth;
        }
        else
        {
            var sub = new SuscripcionPush
            {
                ResponsableId = responsableId,
                Endpoint = request.Endpoint,
                P256dh = request.P256dh,
                Auth = request.Auth,
                CreatedAt = DateTime.UtcNow
            };
            _context.SuscripcionesPush.Add(sub);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Dispositivo suscrito a notificaciones Web Push exitosamente." });
    }

    [Authorize]
    [HttpPost("desuscribir")]
    public async Task<ActionResult> Desuscribir([FromBody] string endpoint)
    {
        var sub = await _context.SuscripcionesPush
            .FirstOrDefaultAsync(s => s.Endpoint == endpoint);

        if (sub != null)
        {
            _context.SuscripcionesPush.Remove(sub);
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Suscripción push eliminada." });
    }
}
