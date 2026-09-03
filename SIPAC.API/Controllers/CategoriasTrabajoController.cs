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

        var nombreLimpio = request.Nombre.Trim();
        var existe = await _context.CategoriasTrabajo.AnyAsync(c => c.Nombre.ToLower() == nombreLimpio.ToLower());
        if (existe)
            return BadRequest(new { message = "Ya existe una categoría/rubro de trabajo con ese nombre" });

        var categoria = new CategoriaTrabajo
        {
            Nombre = nombreLimpio,
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

        var nombreLimpio = request.Nombre.Trim();
        var existe = await _context.CategoriasTrabajo.AnyAsync(c => c.Id != id && c.Nombre.ToLower() == nombreLimpio.ToLower());
        if (existe)
            return BadRequest(new { message = "Ya existe otra categoría/rubro de trabajo con ese nombre" });

        categoria.Nombre = nombreLimpio;
        categoria.Activo = request.Activo;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var categoria = await _context.CategoriasTrabajo.FindAsync(id);
        if (categoria == null)
            return NotFound(new { message = $"Categoría de Trabajo #{id} no encontrada" });

        var totalOrdenes = await _context.OrdenesTrabajo.CountAsync(o => o.CategoriaId == id);
        if (totalOrdenes > 0)
        {
            return BadRequest(new { message = $"No se puede eliminar el rubro porque tiene {totalOrdenes} orden(es) de trabajo asociada(s). Puede desactivarlo en su lugar." });
        }

        _context.CategoriasTrabajo.Remove(categoria);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
