using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.CategoriasTrabajo;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriasTrabajoController : ControllerBase
{
    private readonly SipacDbContext _context;

    public CategoriasTrabajoController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<CategoriaTrabajoDto>>> GetAll([FromQuery] bool? soloActivas)
    {
        var query = _context.CategoriasTrabajo.AsNoTracking().AsQueryable();

        if (soloActivas == true)
        {
            query = query.Where(c => c.Activo);
        }

        var list = await query
            .OrderBy(c => c.Nombre)
            .Select(c => new CategoriaTrabajoDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Activo = c.Activo,
                CantidadOrdenes = c.OrdenesTrabajo.Count
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoriaTrabajoDto>> GetById(Guid id)
    {
        var c = await _context.CategoriasTrabajo
            .AsNoTracking()
            .Include(x => x.OrdenesTrabajo)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (c == null) return NotFound(new { message = $"Categoría de Trabajo #{id} no encontrada" });

        return Ok(new CategoriaTrabajoDto
        {
            Id = c.Id,
            Nombre = c.Nombre,
            Activo = c.Activo,
            CantidadOrdenes = c.OrdenesTrabajo.Count
        });
    }

    [HttpPost]
    public async Task<ActionResult<CategoriaTrabajoDto>> Create([FromBody] CreateCategoriaTrabajoDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "El nombre del rubro/categoría es requerido" });

        var categoria = new CategoriaTrabajo
        {
            Nombre = request.Nombre.Trim(),
            Activo = true
        };

        _context.CategoriasTrabajo.Add(categoria);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = categoria.Id }, new CategoriaTrabajoDto
        {
            Id = categoria.Id,
            Nombre = categoria.Nombre,
            Activo = categoria.Activo,
            CantidadOrdenes = 0
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateCategoriaTrabajoDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "El nombre del rubro/categoría es requerido" });

        var categoria = await _context.CategoriasTrabajo.FindAsync(id);
        if (categoria == null)
            return NotFound(new { message = $"Categoría de Trabajo #{id} no encontrada" });

        categoria.Nombre = request.Nombre.Trim();
        categoria.Activo = request.Activo;

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
