using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Empleados;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmpleadosController : ControllerBase
{
    private readonly SipacDbContext _context;

    public EmpleadosController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<EmpleadoDto>>> GetAll([FromQuery] bool soloActivos = true)
    {
        var query = _context.Empleados.AsNoTracking().AsQueryable();
        if (soloActivos) query = query.Where(e => e.Activo);

        var list = await query
            .OrderBy(e => e.NombreCompleto)
            .Select(e => new EmpleadoDto
            {
                Id = e.Id,
                NombreCompleto = e.NombreCompleto,
                Legajo = e.Legajo ?? "",
                PuestoSector = e.PuestoSector ?? "",
                Activo = e.Activo,
                CantidadOrdenes = e.OrdenesTrabajo.Count
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<EmpleadoDto>> Create([FromBody] CreateEmpleadoDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NombreCompleto))
            return BadRequest(new { message = "El nombre completo es requerido" });

        var legajoTrimmed = request.Legajo?.Trim();
        if (!string.IsNullOrWhiteSpace(legajoTrimmed) &&
            await _context.Empleados.AnyAsync(e => e.Legajo != null && e.Legajo.ToLower() == legajoTrimmed.ToLower()))
        {
            return BadRequest(new { message = "El legajo ya está registrado" });
        }

        var empleado = new Empleado
        {
            Id = Guid.NewGuid(),
            NombreCompleto = request.NombreCompleto.Trim(),
            Legajo = string.IsNullOrWhiteSpace(legajoTrimmed) ? null : legajoTrimmed,
            PuestoSector = string.IsNullOrWhiteSpace(request.PuestoSector) ? null : request.PuestoSector.Trim(),
            Activo = true
        };

        _context.Empleados.Add(empleado);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = empleado.Id }, new EmpleadoDto
        {
            Id = empleado.Id,
            NombreCompleto = empleado.NombreCompleto,
            Legajo = empleado.Legajo ?? "",
            PuestoSector = empleado.PuestoSector ?? "",
            Activo = empleado.Activo,
            CantidadOrdenes = 0
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateEmpleadoDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NombreCompleto))
            return BadRequest(new { message = "El nombre completo es requerido" });

        var empleado = await _context.Empleados.FindAsync(id);
        if (empleado == null) return NotFound(new { message = $"Empleado #{id} no encontrado" });

        var legajoTrimmed = request.Legajo?.Trim();
        if (!string.IsNullOrWhiteSpace(legajoTrimmed) &&
            await _context.Empleados.AnyAsync(e => e.Id != id && e.Legajo != null && e.Legajo.ToLower() == legajoTrimmed.ToLower()))
        {
            return BadRequest(new { message = "El legajo ya está registrado en otro empleado" });
        }

        empleado.NombreCompleto = request.NombreCompleto.Trim();
        empleado.Legajo = string.IsNullOrWhiteSpace(legajoTrimmed) ? null : legajoTrimmed;
        empleado.PuestoSector = string.IsNullOrWhiteSpace(request.PuestoSector) ? null : request.PuestoSector.Trim();
        empleado.Activo = request.Activo;

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
