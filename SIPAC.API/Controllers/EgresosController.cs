using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Egresos;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EgresosController : ControllerBase
{
    private readonly SipacDbContext _context;

    public EgresosController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<EgresoDto>>> GetAll(
        [FromQuery] int? articuloId,
        [FromQuery] long? ordenTrabajoId,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta)
    {
        var query = _context.EgresosConsumo
            .AsNoTracking()
            .Include(e => e.Articulo)
            .Include(e => e.OrdenTrabajo).ThenInclude(o => o!.Responsable)
            .Include(e => e.OrdenTrabajo).ThenInclude(o => o!.UnidadFuncional)
            .Include(e => e.Usuario)
            .AsQueryable();

        if (articuloId.HasValue && articuloId.Value > 0)
            query = query.Where(e => e.ArticuloId == articuloId.Value);

        if (ordenTrabajoId.HasValue && ordenTrabajoId.Value > 0)
            query = query.Where(e => e.OrdenTrabajoId == ordenTrabajoId.Value);

        if (desde.HasValue)
            query = query.Where(e => e.FechaHora >= desde.Value);

        if (hasta.HasValue)
            query = query.Where(e => e.FechaHora <= hasta.Value);

        var list = await query
            .OrderByDescending(e => e.FechaHora)
            .Select(e => new EgresoDto
            {
                Id = e.Id,
                ArticuloId = e.ArticuloId,
                ArticuloNombre = e.Articulo != null ? e.Articulo.Nombre : "",
                UnidadMedida = e.Articulo != null ? e.Articulo.UnidadMedida : "",
                OrdenTrabajoId = e.OrdenTrabajoId,
                NumeroOT = e.OrdenTrabajo != null ? $"OT-{e.OrdenTrabajo.CreatedAt.Year}-{e.OrdenTrabajo.IdOt:D4}" : "",
                UnidadFuncionalDisplay = e.OrdenTrabajo != null && e.OrdenTrabajo.UnidadFuncional != null
                    ? (e.OrdenTrabajo.UnidadFuncional.SectorEscalera.ToUpper() == "LOCAL"
                        ? $"LOCAL Nº {e.OrdenTrabajo.UnidadFuncional.Piso}"
                        : $"UF {e.OrdenTrabajo.UnidadFuncional.Id} (Sec {e.OrdenTrabajo.UnidadFuncional.SectorEscalera} - {e.OrdenTrabajo.UnidadFuncional.Piso} \"{e.OrdenTrabajo.UnidadFuncional.Depto}\")")
                    : "",
                EmpleadoNombre = e.OrdenTrabajo != null && e.OrdenTrabajo.Responsable != null ? e.OrdenTrabajo.Responsable.Nombre : "",
                Cantidad = e.Cantidad,
                FechaHora = e.FechaHora,
                UsuarioId = e.UsuarioId,
                UsuarioNombre = e.Usuario != null ? e.Usuario.NombreCompleto : "",
                Observacion = e.Observacion
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<EgresoDto>> Create([FromBody] CreateEgresoDto request)
    {
        if (request.Cantidad <= 0)
            return BadRequest(new { message = "La cantidad a entregar debe ser mayor a 0" });

        var articulo = await _context.Articulos.FindAsync(request.ArticuloId);
        if (articulo == null || !articulo.Activo)
            return BadRequest(new { message = "El artículo no existe o está inactivo" });

        if (articulo.StockActual < request.Cantidad)
            return BadRequest(new { message = $"Stock insuficiente. Stock disponible: {articulo.StockActual} {articulo.UnidadMedida}" });

        var ot = await _context.OrdenesTrabajo
            .Include(o => o.Responsable)
            .Include(o => o.UnidadFuncional)
            .FirstOrDefaultAsync(o => o.IdOt == request.OrdenTrabajoId);

        if (ot == null)
            return BadRequest(new { message = "La Orden de Trabajo seleccionada no existe o fue dada de baja" });

        if (ot.Estado == "Finalizado" || ot.Estado == "Cancelado")
            return BadRequest(new { message = $"No se pueden despachar insumos a una OT en estado '{ot.Estado}'. Solo se admiten OTs activas (Pendiente o En Proceso)." });

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdStr, out var userId);
        if (userId == 0)
        {
            var firstUser = await _context.Usuarios.FirstOrDefaultAsync();
            userId = firstUser?.Id ?? 1;
        }

        // Descontar stock en tiempo real
        articulo.StockActual -= request.Cantidad;

        var egreso = new EgresoConsumo
        {
            ArticuloId = request.ArticuloId,
            OrdenTrabajoId = request.OrdenTrabajoId,
            Cantidad = request.Cantidad,
            FechaHora = DateTime.UtcNow,
            UsuarioId = userId,
            Observacion = request.Observacion?.Trim()
        };

        _context.EgresosConsumo.Add(egreso);

        var obs = string.IsNullOrWhiteSpace(request.Observacion) ? "-" : request.Observacion;
        var bitacora = new RegistroBitacoraOt
        {
            OrdenTrabajoId = ot.IdOt,
            TipoOperacion = "MODIFICACION",
            DetalleCambio = $"Consumo de pañol despachado: {request.Cantidad} {articulo.UnidadMedida} de '{articulo.Nombre}'. Obs: {obs}",
            FechaHora = DateTime.UtcNow
        };
        _context.BitacoraOt.Add(bitacora);

        await _context.SaveChangesAsync();

        var usuario = await _context.Usuarios.FindAsync(userId);

        var ufDisplay = ot.UnidadFuncional != null
            ? (ot.UnidadFuncional.SectorEscalera.ToUpper() == "LOCAL"
                ? $"LOCAL Nº {ot.UnidadFuncional.Piso}"
                : $"UF {ot.UnidadFuncional.Id} (Sec {ot.UnidadFuncional.SectorEscalera} - {ot.UnidadFuncional.Piso} \"{ot.UnidadFuncional.Depto}\")")
            : "";

        return Ok(new EgresoDto
        {
            Id = egreso.Id,
            ArticuloId = egreso.ArticuloId,
            ArticuloNombre = articulo.Nombre,
            UnidadMedida = articulo.UnidadMedida,
            OrdenTrabajoId = egreso.OrdenTrabajoId,
            NumeroOT = $"OT-{ot.CreatedAt.Year}-{ot.IdOt:D4}",
            UnidadFuncionalDisplay = ufDisplay,
            EmpleadoNombre = ot.Responsable?.Nombre ?? "",
            Cantidad = egreso.Cantidad,
            FechaHora = egreso.FechaHora,
            UsuarioId = egreso.UsuarioId,
            UsuarioNombre = usuario?.NombreCompleto ?? "",
            Observacion = egreso.Observacion
        });
    }
}
