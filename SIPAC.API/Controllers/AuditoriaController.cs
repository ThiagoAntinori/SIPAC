using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Auditoria;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AuditoriaController : ControllerBase
{
    private readonly SipacDbContext _context;

    public AuditoriaController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<AuditLogDto>>> GetAll()
    {
        var logs = await _context.AuditLogs
            .Include(a => a.Usuario)
            .OrderByDescending(a => a.Timestamp)
            .Take(100)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                UsuarioId = a.UsuarioId,
                UsuarioNombre = a.Usuario != null ? a.Usuario.NombreCompleto : "Sistema",
                Accion = a.Accion,
                Model = a.Model,
                ModelId = a.ModelId,
                ValoresAnteriores = a.ValoresAnteriores,
                ValoresNuevos = a.ValoresNuevos,
                IP = a.IP,
                Timestamp = a.Timestamp
            })
            .ToListAsync();

        return Ok(logs);
    }
}
