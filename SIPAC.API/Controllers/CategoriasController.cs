using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Categorias;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriasController : ControllerBase
{
    private readonly SipacDbContext _context;

    public CategoriasController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<CategoriaDto>>> GetAll()
    {
        var categorias = await _context.Categorias
            .Select(c => new CategoriaDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                CantidadArticulos = c.Articulos.Count(a => a.Activo)
            })
            .OrderBy(c => c.Nombre)
            .ToListAsync();

        return Ok(categorias);
    }

    [HttpPost]
    public async Task<ActionResult<CategoriaDto>> Create([FromBody] CreateCategoriaDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "El nombre de categoría es requerido" });

        var nombreLimpio = request.Nombre.Trim();
        var existe = await _context.Categorias.AnyAsync(c => c.Nombre.ToLower() == nombreLimpio.ToLower());
        if (existe)
            return BadRequest(new { message = "Ya existe una categoría de artículo con ese nombre" });

        var categoria = new Categoria
        {
            Nombre = nombreLimpio
        };

        _context.Categorias.Add(categoria);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = categoria.Id }, new CategoriaDto
        {
            Id = categoria.Id,
            Nombre = categoria.Nombre,
            CantidadArticulos = 0
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] CreateCategoriaDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "El nombre de categoría es requerido" });

        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria == null) return NotFound(new { message = "Categoría no encontrada" });

        var nombreLimpio = request.Nombre.Trim();
        var existe = await _context.Categorias.AnyAsync(c => c.Id != id && c.Nombre.ToLower() == nombreLimpio.ToLower());
        if (existe)
            return BadRequest(new { message = "Ya existe otra categoría de artículo con ese nombre" });

        categoria.Nombre = nombreLimpio;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria == null) return NotFound(new { message = "Categoría no encontrada" });

        var totalArticulos = await _context.Articulos.CountAsync(a => a.CategoriaId == id);
        if (totalArticulos > 0)
        {
            return BadRequest(new { message = $"No se puede eliminar la categoría porque contiene {totalArticulos} artículo(s) asociado(s)." });
        }

        _context.Categorias.Remove(categoria);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
