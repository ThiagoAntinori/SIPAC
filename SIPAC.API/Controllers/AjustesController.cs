using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Ajustes;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AjustesController : ControllerBase
{
    private readonly SipacDbContext _context;

    public AjustesController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<AjusteDto>>> GetAll()
    {
        var ajustes = await _context.AjustesInventario
            .Include(a => a.Articulo)
            .Include(a => a.Usuario)
            .OrderByDescending(a => a.FechaHora)
            .Select(a => new AjusteDto
            {
                Id = a.Id,
                ArticuloId = a.ArticuloId,
                ArticuloNombre = a.Articulo != null ? a.Articulo.Nombre : "",
                UnidadMedida = a.Articulo != null ? a.Articulo.UnidadMedida : "",
                Cantidad = a.Cantidad,
                Motivo = a.Motivo,
                Justificacion = a.Justificacion,
                TipoAjuste = a.TipoAjuste,
                FechaHora = a.FechaHora,
                UsuarioId = a.UsuarioId,
                UsuarioNombre = a.Usuario != null ? a.Usuario.NombreCompleto : ""
            })
            .ToListAsync();

        return Ok(ajustes);
    }

    [HttpPost]
    public async Task<ActionResult<AjusteDto>> Create([FromBody] CreateAjusteDto request)
    {
        var articulo = await _context.Articulos.FindAsync(request.ArticuloId);
        if (articulo == null) return NotFound(new { message = "Artículo no encontrado" });

        if (request.Cantidad < 0)
            return BadRequest(new { message = "La cantidad del ajuste no puede ser negativa." });

        if (!articulo.EsFraccionable && request.Cantidad % 1 != 0)
        {
            return BadRequest(new { message = $"El artículo '{articulo.Nombre}' no es fraccionable y no admite cantidades con decimales." });
        }

        if (request.TipoAjuste.Equals("Baja", StringComparison.OrdinalIgnoreCase) && articulo.StockActual < request.Cantidad)
        {
            return BadRequest(new { message = $"Stock insuficiente para realizar la baja. Stock disponible: {articulo.StockActual} {articulo.UnidadMedida}." });
        }

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdStr, out var userId);
        if (userId == 0)
        {
            var firstUser = await _context.Usuarios.FirstOrDefaultAsync();
            userId = firstUser?.Id ?? 1;
        }

        // Aplicar cambio al stock
        if (request.TipoAjuste.Equals("Alta", StringComparison.OrdinalIgnoreCase))
        {
            articulo.StockActual += request.Cantidad;
        }
        else if (request.TipoAjuste.Equals("Baja", StringComparison.OrdinalIgnoreCase))
        {
            articulo.StockActual = Math.Max(0, articulo.StockActual - request.Cantidad);
        }
        else // Recuento físico
        {
            articulo.StockActual = Math.Max(0, request.Cantidad);
        }

        var ajuste = new AjusteInventario
        {
            ArticuloId = request.ArticuloId,
            Cantidad = request.Cantidad,
            Motivo = request.Motivo.Trim(),
            Justificacion = request.Justificacion.Trim(),
            TipoAjuste = request.TipoAjuste.Trim(),
            FechaHora = DateTime.UtcNow,
            UsuarioId = userId
        };

        _context.AjustesInventario.Add(ajuste);
        await _context.SaveChangesAsync();

        var usuario = await _context.Usuarios.FindAsync(userId);

        return Ok(new AjusteDto
        {
            Id = ajuste.Id,
            ArticuloId = ajuste.ArticuloId,
            ArticuloNombre = articulo.Nombre,
            UnidadMedida = articulo.UnidadMedida,
            Cantidad = ajuste.Cantidad,
            Motivo = ajuste.Motivo,
            Justificacion = ajuste.Justificacion,
            TipoAjuste = ajuste.TipoAjuste,
            FechaHora = ajuste.FechaHora,
            UsuarioId = ajuste.UsuarioId,
            UsuarioNombre = usuario?.NombreCompleto ?? ""
        });
    }
}
