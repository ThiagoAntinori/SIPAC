using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Articulos;
using SIPAC.API.DTOs.Dashboard;
using SIPAC.API.DTOs.Egresos;
using SIPAC.API.DTOs.OrdenesTrabajo;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly SipacDbContext _context;

    public DashboardController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet("resumen")]
    public async Task<ActionResult<DashboardSummaryDto>> GetResumen()
    {
        var totalArticulos = await _context.Articulos.CountAsync(a => a.Activo);

        var stockCriticoList = await _context.Articulos
            .Include(a => a.Categoria)
            .Where(a => a.Activo && a.StockActual <= a.StockMinimo)
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

        var ordenesActivas = await _context.OrdenesTrabajo
            .CountAsync(o => o.Estado == "Pendiente" || o.Estado == "En Proceso");

        var cincoDiasAtras = DateTime.UtcNow.AddDays(-5);
        var alertasInactividad = await _context.OrdenesTrabajo
            .CountAsync(o => o.Estado == "Pendiente" && o.CreatedAt <= cincoDiasAtras);

        var hoy = DateTime.UtcNow.Date;
        var egresosHoy = await _context.EgresosConsumo
            .CountAsync(e => e.FechaHora >= hoy);

        var egresosEntities = await _context.EgresosConsumo
            .Include(e => e.Articulo)
            .Include(e => e.OrdenTrabajo).ThenInclude(o => o!.Responsable)
            .Include(e => e.OrdenTrabajo).ThenInclude(o => o!.UnidadFuncional)
            .Include(e => e.Usuario)
            .OrderByDescending(e => e.FechaHora)
            .Take(5)
            .ToListAsync();

        var egresosRecientes = egresosEntities.Select(e => new EgresoDto
        {
            Id = e.Id,
            ArticuloId = e.ArticuloId,
            ArticuloNombre = e.Articulo != null ? e.Articulo.Nombre : "",
            UnidadMedida = e.Articulo != null ? e.Articulo.UnidadMedida : "",
            OrdenTrabajoId = e.OrdenTrabajoId,
            NumeroOT = e.OrdenTrabajo != null ? e.OrdenTrabajo.NumeroOT : "",
            UnidadFuncionalDisplay = e.OrdenTrabajo?.UnidadFuncional?.DisplayNombre ?? "",
            EmpleadoNombre = e.OrdenTrabajo?.Responsable?.Nombre ?? "",
            Cantidad = e.Cantidad,
            FechaHora = e.FechaHora,
            UsuarioId = e.UsuarioId,
            UsuarioNombre = e.Usuario != null ? e.Usuario.NombreCompleto : "",
            Observacion = e.Observacion
        }).ToList();

        var ultimasOrdenesEntities = await _context.OrdenesTrabajo
            .Include(o => o.UnidadFuncional)
            .Include(o => o.Responsable)
            .Include(o => o.Categoria)
            .Include(o => o.Egresos).ThenInclude(e => e.Articulo)
            .Include(o => o.Bitacora)
            .OrderByDescending(o => o.CreatedAt)
            .Take(5)
            .ToListAsync();

        var ultimasOrdenes = ultimasOrdenesEntities.Select(o => new OtDto
        {
            IdOt = o.IdOt,
            NumeroOT = o.NumeroOT,
            UnidadFuncionalId = o.UnidadFuncionalId,
            UnidadFuncionalDisplay = o.UnidadFuncional?.DisplayNombre ?? "",
            SectorEscalera = o.UnidadFuncional?.SectorEscalera ?? "",
            Piso = o.UnidadFuncional?.Piso,
            Depto = o.UnidadFuncional?.Depto,
            ResponsableId = o.ResponsableId,
            ResponsableNombre = o.Responsable?.Nombre ?? "",
            CategoriaId = o.CategoriaId,
            CategoriaNombre = o.Categoria?.Nombre ?? "",
            ProblemaReportado = o.ProblemaReportado,
            SolucionRealizada = o.SolucionRealizada,
            Estado = o.Estado,
            Observaciones = o.Observaciones,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt,
            EsAlertaInactividad = o.EsAlertaInactividad,
            DiasPendiente = o.DiasPendiente,
            InsumosConsumidos = o.Egresos.Select(eg => new OtEgresoItemDto
            {
                Id = eg.Id,
                ArticuloId = eg.ArticuloId,
                ArticuloNombre = eg.Articulo?.Nombre ?? "",
                UnidadMedida = eg.Articulo?.UnidadMedida ?? "",
                Cantidad = eg.Cantidad,
                FechaHora = eg.FechaHora,
                UsuarioNombre = eg.Usuario?.NombreCompleto ?? "",
                Observacion = eg.Observacion
            }).ToList()
        }).ToList();

        return Ok(new DashboardSummaryDto
        {
            TotalArticulos = totalArticulos,
            ArticulosStockBajo = stockCriticoList.Count,
            TotalOrdenesActivas = ordenesActivas,
            TotalAlertasInactividad = alertasInactividad,
            EgresosHoy = egresosHoy,
            StockCritico = stockCriticoList,
            EgresosRecientes = egresosRecientes,
            UltimasOrdenes = ultimasOrdenes
        });
    }
}
