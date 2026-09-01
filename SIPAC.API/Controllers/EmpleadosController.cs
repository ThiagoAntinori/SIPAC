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
        var query = _context.Empleados.AsQueryable();
        if (soloActivos) query = query.Where(e => e.Activo);

        var list = await query
            .OrderBy(e => e.NombreCompleto)
            .Select(e => new EmpleadoDto
            {
                Id = e.Id,
                NombreCompleto = e.NombreCompleto,
                Legajo = e.Legajo,
                PuestoSector = e.PuestoSector,
                Activo = e.Activo
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<EmpleadoDto>> Create([FromBody] CreateEmpleadoDto request)
    {
        if (await _context.Empleados.AnyAsync(e => e.Legajo.ToLower() == request.Legajo.ToLower()))
            return BadRequest(new { message = "El legajo ya está registrado" });

        var empleado = new Empleado
        {
            NombreCompleto = request.NombreCompleto.Trim(),
            Legajo = request.Legajo.Trim(),
            PuestoSector = request.PuestoSector.Trim(),
            Activo = true
        };

        _context.Empleados.Add(empleado);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = empleado.Id }, new EmpleadoDto
        {
            Id = empleado.Id,
            NombreCompleto = empleado.NombreCompleto,
            Legajo = empleado.Legajo,
            PuestoSector = empleado.PuestoSector,
            Activo = empleado.Activo
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdateEmpleadoDto request)
    {
        var empleado = await _context.Empleados.FindAsync(id);
        if (empleado == null) return NotFound();

        empleado.NombreCompleto = request.NombreCompleto.Trim();
        empleado.Legajo = request.Legajo.Trim();
        empleado.PuestoSector = request.PuestoSector.Trim();
        empleado.Activo = request.Activo;

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
