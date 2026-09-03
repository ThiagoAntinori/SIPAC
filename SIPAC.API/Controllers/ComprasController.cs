using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Compras;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ComprasController : ControllerBase
{
    private readonly SipacDbContext _context;

    public ComprasController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<CompraDto>>> GetAll()
    {
        var compras = await _context.Compras
            .Include(c => c.Usuario)
            .Include(c => c.Detalles).ThenInclude(d => d.Articulo)
            .OrderByDescending(c => c.FechaCarga)
            .Select(c => new CompraDto
            {
                Id = c.Id,
                NroComprobante = c.NroComprobante,
                FechaCompra = c.FechaCompra,
                FechaCarga = c.FechaCarga,
                UsuarioId = c.UsuarioId,
                UsuarioNombre = c.Usuario != null ? c.Usuario.NombreCompleto : "",
                FotoComprobanteUrl = c.FotoComprobanteUrl,
                ObservacionesDiferencia = c.ObservacionesDiferencia,
                Detalles = c.Detalles.Select(d => new DetalleCompraDto
                {
                    Id = d.Id,
                    ArticuloId = d.ArticuloId,
                    ArticuloNombre = d.Articulo != null ? d.Articulo.Nombre : "",
                    UnidadMedida = d.Articulo != null ? d.Articulo.UnidadMedida : "",
                    CantidadRecibida = d.CantidadRecibida
                }).ToList()
            })
            .ToListAsync();

        return Ok(compras);
    }

    [HttpPost]
    public async Task<ActionResult<CompraDto>> Create([FromBody] CreateCompraDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NroComprobante))
            return BadRequest(new { message = "El número de comprobante es requerido" });

        if (request.Detalles == null || !request.Detalles.Any())
            return BadRequest(new { message = "Debe ingresar al menos un artículo en la compra" });

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdStr, out var userId);
        if (userId == 0)
        {
            var firstUser = await _context.Usuarios.FirstOrDefaultAsync();
            userId = firstUser?.Id ?? 1;
        }

        var compra = new Compra
        {
            NroComprobante = request.NroComprobante.Trim(),
            FechaCompra = request.FechaCompra,
            FechaCarga = DateTime.UtcNow,
            UsuarioId = userId,
            FotoComprobanteUrl = request.FotoComprobanteUrl,
            ObservacionesDiferencia = request.ObservacionesDiferencia?.Trim()
        };

        foreach (var det in request.Detalles)
        {
            if (det.CantidadRecibida <= 0)
                return BadRequest(new { message = "La cantidad recibida debe ser mayor a 0 en todos los artículos." });

            var artCheck = await _context.Articulos.FindAsync(det.ArticuloId);
            if (artCheck == null || !artCheck.Activo)
                return BadRequest(new { message = $"El artículo con ID {det.ArticuloId} no existe o está inactivo." });

            if (!artCheck.EsFraccionable && det.CantidadRecibida % 1 != 0)
                return BadRequest(new { message = $"El artículo '{artCheck.Nombre}' no es fraccionable y no admite cantidades con decimales." });
        }

        foreach (var det in request.Detalles)
        {
            var articulo = await _context.Articulos.FindAsync(det.ArticuloId);
            if (articulo != null)
            {
                articulo.StockActual += det.CantidadRecibida;
                compra.Detalles.Add(new DetalleCompra
                {
                    ArticuloId = det.ArticuloId,
                    CantidadRecibida = det.CantidadRecibida
                });
            }
        }

        _context.Compras.Add(compra);
        await _context.SaveChangesAsync();

        return Ok(new CompraDto
        {
            Id = compra.Id,
            NroComprobante = compra.NroComprobante,
            FechaCompra = compra.FechaCompra,
            FechaCarga = compra.FechaCarga,
            UsuarioId = compra.UsuarioId,
            FotoComprobanteUrl = compra.FotoComprobanteUrl,
            ObservacionesDiferencia = compra.ObservacionesDiferencia
        });
    }
}
