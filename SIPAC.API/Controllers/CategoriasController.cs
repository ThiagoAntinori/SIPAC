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

        var categoria = new Categoria
        {
            Nombre = request.Nombre.Trim()
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
        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria == null) return NotFound();

        categoria.Nombre = request.Nombre.Trim();
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
