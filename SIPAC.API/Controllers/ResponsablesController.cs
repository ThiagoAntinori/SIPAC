using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Responsables;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResponsablesController : ControllerBase
{
    private readonly SipacDbContext _context;

    public ResponsablesController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<ResponsableDto>>> GetAll([FromQuery] bool? soloActivos)
    {
        var query = _context.Responsables.AsNoTracking().AsQueryable();

        if (soloActivos == true)
        {
            query = query.Where(r => r.Activo);
        }

        var list = await query
            .OrderBy(r => r.Nombre)
            .Select(r => new ResponsableDto
            {
                Id = r.Id,
                Nombre = r.Nombre,
                Activo = r.Activo,
                CantidadOrdenes = r.OrdenesTrabajo.Count
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ResponsableDto>> GetById(Guid id)
    {
        var r = await _context.Responsables
            .AsNoTracking()
            .Include(x => x.OrdenesTrabajo)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (r == null) return NotFound(new { message = $"Responsable #{id} no encontrado" });

        return Ok(new ResponsableDto
        {
            Id = r.Id,
            Nombre = r.Nombre,
            Activo = r.Activo,
            CantidadOrdenes = r.OrdenesTrabajo.Count
        });
    }

    [HttpPost]
    public async Task<ActionResult<ResponsableDto>> Create([FromBody] CreateResponsableDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "El nombre del responsable es requerido" });

        var responsable = new Responsable
        {
            Nombre = request.Nombre.Trim(),
            Activo = true
        };

        _context.Responsables.Add(responsable);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = responsable.Id }, new ResponsableDto
        {
            Id = responsable.Id,
            Nombre = responsable.Nombre,
            Activo = responsable.Activo,
            CantidadOrdenes = 0
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateResponsableDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "El nombre del responsable es requerido" });

        var responsable = await _context.Responsables.FindAsync(id);
        if (responsable == null)
            return NotFound(new { message = $"Responsable #{id} no encontrado" });

        responsable.Nombre = request.Nombre.Trim();
        responsable.Activo = request.Activo;

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
