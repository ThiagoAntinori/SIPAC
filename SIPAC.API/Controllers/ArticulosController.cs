using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Articulos;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ArticulosController : ControllerBase
{
    private readonly SipacDbContext _context;

    public ArticulosController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<ArticuloDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? categoriaId,
        [FromQuery] bool? soloCriticos,
        [FromQuery] bool incluirInactivos = false)
    {
        var query = _context.Articulos.Include(a => a.Categoria).AsQueryable();

        if (!incluirInactivos)
            query = query.Where(a => a.Activo);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(a => a.Nombre.ToLower().Contains(s));
        }

        if (categoriaId.HasValue && categoriaId.Value > 0)
            query = query.Where(a => a.CategoriaId == categoriaId.Value);

        if (soloCriticos.HasValue && soloCriticos.Value)
            query = query.Where(a => (double)a.StockActual <= (double)a.StockMinimo);

        var list = await query
            .OrderBy(a => a.Nombre)
            .Select(a => new ArticuloDto
            {
                Id = a.Id,
                Nombre = a.Nombre,
                CategoriaId = a.CategoriaId,
                CategoriaNombre = a.Categoria != null ? a.Categoria.Nombre : "",
                UnidadMedida = a.UnidadMedida,
                EsFraccionable = a.EsFraccionable,
                StockActual = a.StockActual,
                StockMinimo = a.StockMinimo,
                Activo = a.Activo
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ArticuloDto>> GetById(int id)
    {
        var a = await _context.Articulos.Include(x => x.Categoria).FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();

        return Ok(new ArticuloDto
        {
            Id = a.Id,
            Nombre = a.Nombre,
            CategoriaId = a.CategoriaId,
            CategoriaNombre = a.Categoria?.Nombre ?? "",
            UnidadMedida = a.UnidadMedida,
            EsFraccionable = a.EsFraccionable,
            StockActual = a.StockActual,
            StockMinimo = a.StockMinimo,
            Activo = a.Activo
        });
    }

    [HttpPost]
    public async Task<ActionResult<ArticuloDto>> Create([FromBody] CreateArticuloDto request)
    {
        if (request.StockActual < 0 || request.StockMinimo < 0)
            return BadRequest(new { message = "Los valores de stock no pueden ser negativos." });

        if (!request.EsFraccionable)
        {
            if (request.StockActual % 1 != 0 || request.StockMinimo % 1 != 0)
            {
                return BadRequest(new { message = "Los artículos que no son fraccionables no permiten números decimales en stock actual ni stock mínimo." });
            }
        }

        var articulo = new Articulo
        {
            Nombre = request.Nombre.Trim(),
            CategoriaId = request.CategoriaId,
            UnidadMedida = request.UnidadMedida.Trim(),
            EsFraccionable = request.EsFraccionable,
            StockActual = request.StockActual,
            StockMinimo = request.StockMinimo,
            Activo = true
        };

        _context.Articulos.Add(articulo);
        await _context.SaveChangesAsync();

        await _context.Entry(articulo).Reference(a => a.Categoria).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = articulo.Id }, new ArticuloDto
        {
            Id = articulo.Id,
            Nombre = articulo.Nombre,
            CategoriaId = articulo.CategoriaId,
            CategoriaNombre = articulo.Categoria?.Nombre ?? "",
            UnidadMedida = articulo.UnidadMedida,
            EsFraccionable = articulo.EsFraccionable,
            StockActual = articulo.StockActual,
            StockMinimo = articulo.StockMinimo,
            Activo = articulo.Activo
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdateArticuloDto request)
    {
        var articulo = await _context.Articulos.FindAsync(id);
        if (articulo == null) return NotFound();

        if (request.StockMinimo < 0)
            return BadRequest(new { message = "El stock mínimo no puede ser negativo." });

        if (!request.EsFraccionable)
        {
            if (request.StockMinimo % 1 != 0)
            {
                return BadRequest(new { message = "Los artículos que no son fraccionables no permiten números decimales en el stock mínimo." });
            }
            if (articulo.StockActual % 1 != 0)
            {
                return BadRequest(new { message = "No se puede marcar el artículo como no fraccionable porque su stock actual posee decimales. Realice un ajuste de stock primero." });
            }
        }

        articulo.Nombre = request.Nombre.Trim();
        articulo.CategoriaId = request.CategoriaId;
        articulo.UnidadMedida = request.UnidadMedida.Trim();
        articulo.EsFraccionable = request.EsFraccionable;
        articulo.StockMinimo = request.StockMinimo;
        articulo.Activo = request.Activo;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> ToggleActivo(int id)
    {
        var articulo = await _context.Articulos.FindAsync(id);
        if (articulo == null) return NotFound();

        articulo.Activo = !articulo.Activo;
        await _context.SaveChangesAsync();
        return Ok(new { message = $"Artículo {(articulo.Activo ? "activado" : "desactivado")}" });
    }
}
