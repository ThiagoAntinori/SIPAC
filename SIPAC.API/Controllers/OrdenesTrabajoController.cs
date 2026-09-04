using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.OrdenesTrabajo;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdenesTrabajoController : ControllerBase
{
    private readonly SipacDbContext _context;

    public OrdenesTrabajoController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<OtDto>>> GetAll(
        [FromQuery] string? estado,
        [FromQuery] Guid? responsableId,
        [FromQuery] Guid? categoriaId,
        [FromQuery] Guid? unidadFuncionalId,
        [FromQuery] bool? soloAlertas,
        [FromQuery] string? search)
    {
        var query = _context.OrdenesTrabajo
            .AsNoTracking()
            .Include(o => o.UnidadFuncional)
            .Include(o => o.Responsable)
            .Include(o => o.Categoria)
            .Include(o => o.Egresos).ThenInclude(e => e.Articulo)
            .Include(o => o.Egresos).ThenInclude(e => e.Usuario)
            .Include(o => o.Bitacora)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(estado))
        {
            query = query.Where(o => o.Estado.ToLower() == estado.Trim().ToLower());
        }

        if (responsableId.HasValue && responsableId.Value != Guid.Empty)
        {
            query = query.Where(o => o.ResponsableId == responsableId.Value);
        }

        if (categoriaId.HasValue && categoriaId.Value != Guid.Empty)
        {
            query = query.Where(o => o.CategoriaId == categoriaId.Value);
        }

        if (unidadFuncionalId.HasValue && unidadFuncionalId.Value != Guid.Empty)
        {
            query = query.Where(o => o.UnidadFuncionalId == unidadFuncionalId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(o =>
                o.Id.ToString().Contains(s) ||
                o.ProblemaReportado.ToLower().Contains(s) ||
                (o.SolucionRealizada != null && o.SolucionRealizada.ToLower().Contains(s)) ||
                (o.Observaciones != null && o.Observaciones.ToLower().Contains(s)) ||
                (o.Responsable != null && o.Responsable.NombreCompleto.ToLower().Contains(s)) ||
                (o.Categoria != null && o.Categoria.Nombre.ToLower().Contains(s)) ||
                (o.UnidadFuncional != null && (
                    o.UnidadFuncional.Id.ToString().Contains(s) ||
                    o.UnidadFuncional.SectorEscalera.ToLower().Contains(s) ||
                    (o.UnidadFuncional.Piso != null && o.UnidadFuncional.Piso.ToLower().Contains(s)) ||
                    (o.UnidadFuncional.Depto != null && o.UnidadFuncional.Depto.ToLower().Contains(s))
                )));
        }

        var ots = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var list = ots.Select(o => MapToDto(o)).ToList();

        if (soloAlertas == true)
        {
            list = list.Where(o => o.EsAlertaInactividad).ToList();
        }

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OtDto>> GetById(Guid id)
    {
        var ot = await _context.OrdenesTrabajo
            .AsNoTracking()
            .Include(o => o.UnidadFuncional)
            .Include(o => o.Responsable)
            .Include(o => o.Categoria)
            .Include(o => o.Egresos).ThenInclude(e => e.Articulo)
            .Include(o => o.Egresos).ThenInclude(e => e.Usuario)
            .Include(o => o.Bitacora)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (ot == null) return NotFound(new { message = $"Orden de Trabajo #{id} no encontrada" });

        return Ok(MapToDto(ot));
    }

    [HttpPost]
    public async Task<ActionResult<OtDto>> Create([FromBody] CreateOtDto request)
    {
        if (request.UnidadFuncionalId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar una Unidad Funcional válida" });

        if (request.ResponsableId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar un Responsable" });

        if (request.CategoriaId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar un Rubro / Categoría" });

        if (string.IsNullOrWhiteSpace(request.ProblemaReportado) || request.ProblemaReportado.Trim().Length < 3)
            return BadRequest(new { message = "Debe describir el problema reportado (mínimo 3 caracteres)" });

        var uf = await _context.UnidadesFuncionales.FindAsync(request.UnidadFuncionalId);
        if (uf == null)
            return BadRequest(new { message = $"La Unidad Funcional #{request.UnidadFuncionalId} no existe" });

        var responsable = await _context.Empleados.FindAsync(request.ResponsableId);
        if (responsable == null || !responsable.Activo)
            return BadRequest(new { message = "El responsable seleccionado no existe o está inactivo" });

        var categoria = await _context.CategoriasTrabajo.FindAsync(request.CategoriaId);
        if (categoria == null || !categoria.Activo)
            return BadRequest(new { message = "La categoría seleccionada no existe o está inactiva" });

        var ot = new OrdenTrabajo
        {
            Id = Guid.NewGuid(),
            UnidadFuncionalId = request.UnidadFuncionalId,
            ResponsableId = request.ResponsableId,
            CategoriaId = request.CategoriaId,
            ProblemaReportado = request.ProblemaReportado.Trim(),
            Observaciones = request.Observaciones?.Trim(),
            Estado = "Pendiente",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.OrdenesTrabajo.Add(ot);
        await _context.SaveChangesAsync();

        // Registrar auditoría en bitácora
        var bitacora = new RegistroBitacoraOt
        {
            Id = Guid.NewGuid(),
            OrdenTrabajoId = ot.Id,
            TipoOperacion = "CREACION",
            DetalleCambio = $"Alta de OT para {uf.DisplayNombre}. Responsable: {responsable.Nombre}. Rubro: {categoria.Nombre}. Problema: {ot.ProblemaReportado}",
            FechaHora = DateTime.UtcNow
        };
        _context.BitacoraOt.Add(bitacora);
        await _context.SaveChangesAsync();

        // Cargar navegaciones para respuesta
        ot.UnidadFuncional = uf;
        ot.Responsable = responsable;
        ot.Categoria = categoria;
        ot.Bitacora = new List<RegistroBitacoraOt> { bitacora };

        return CreatedAtAction(nameof(GetById), new { id = ot.Id }, MapToDto(ot));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<OtDto>> Update(Guid id, [FromBody] UpdateOtDto request)
    {
        var ot = await _context.OrdenesTrabajo
            .Include(o => o.UnidadFuncional)
            .Include(o => o.Responsable)
            .Include(o => o.Categoria)
            .Include(o => o.Bitacora)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (ot == null) return NotFound(new { message = $"Orden de Trabajo #{id} no encontrada" });

        if (request.ResponsableId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar un Responsable" });

        if (request.CategoriaId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar un Rubro / Categoría" });

        if (string.IsNullOrWhiteSpace(request.ProblemaReportado) || request.ProblemaReportado.Trim().Length < 3)
            return BadRequest(new { message = "El problema reportado no puede quedar vacío (mínimo 3 caracteres)" });

        // Validación estricta para pasar a Finalizado
        var nuevoEstado = request.Estado?.Trim() ?? ot.Estado;
        if (string.Equals(nuevoEstado, "Finalizado", StringComparison.OrdinalIgnoreCase))
        {
            var solucion = request.SolucionRealizada?.Trim() ?? ot.SolucionRealizada?.Trim();
            if (string.IsNullOrWhiteSpace(solucion))
            {
                return BadRequest(new { message = "Para finalizar la OT es obligatorio ingresar la solución realizada." });
            }
        }

        var responsable = await _context.Empleados.FindAsync(request.ResponsableId);
        if (responsable == null)
            return BadRequest(new { message = "El responsable seleccionado no existe" });

        var categoria = await _context.CategoriasTrabajo.FindAsync(request.CategoriaId);
        if (categoria == null)
            return BadRequest(new { message = "La categoría seleccionada no existe" });

        // Auditoría de cambios
        var cambios = new List<string>();
        var estadoCambiado = false;
        var estadoAnterior = ot.Estado;

        if (!string.Equals(ot.Estado, nuevoEstado, StringComparison.OrdinalIgnoreCase))
        {
            cambios.Add($"Estado: '{ot.Estado}' -> '{nuevoEstado}'");
            estadoCambiado = true;
        }

        if (ot.ResponsableId != request.ResponsableId)
        {
            cambios.Add($"Responsable: '{ot.Responsable?.Nombre}' -> '{responsable.Nombre}'");
        }

        if (ot.CategoriaId != request.CategoriaId)
        {
            cambios.Add($"Rubro: '{ot.Categoria?.Nombre}' -> '{categoria.Nombre}'");
        }

        if (ot.ProblemaReportado != request.ProblemaReportado.Trim())
        {
            cambios.Add("Problema reportado modificado");
        }

        if (ot.SolucionRealizada != request.SolucionRealizada?.Trim())
        {
            cambios.Add("Solución realizada actualizada");
        }

        if (ot.Observaciones != request.Observaciones?.Trim())
        {
            cambios.Add("Observaciones actualizadas");
        }

        // Aplicar cambios
        ot.ResponsableId = request.ResponsableId;
        ot.Responsable = responsable;
        ot.CategoriaId = request.CategoriaId;
        ot.Categoria = categoria;
        ot.ProblemaReportado = request.ProblemaReportado.Trim();
        ot.SolucionRealizada = request.SolucionRealizada?.Trim();
        ot.Estado = nuevoEstado;
        ot.Observaciones = request.Observaciones?.Trim();
        ot.UpdatedAt = DateTime.UtcNow;

        if (cambios.Count > 0)
        {
            var tipoOp = estadoCambiado ? "CAMBIO_ESTADO" : "ACTUALIZACION";
            var bitacora = new RegistroBitacoraOt
            {
                Id = Guid.NewGuid(),
                OrdenTrabajoId = ot.Id,
                TipoOperacion = tipoOp,
                DetalleCambio = string.Join("; ", cambios),
                FechaHora = DateTime.UtcNow
            };
            _context.BitacoraOt.Add(bitacora);
        }

        await _context.SaveChangesAsync();

        return Ok(MapToDto(ot));
    }

    [HttpPatch("{id}/estado")]
    public async Task<ActionResult> ChangeEstado(Guid id, [FromBody] ChangeEstadoOtDto request)
    {
        var ot = await _context.OrdenesTrabajo
            .Include(o => o.Bitacora)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (ot == null) return NotFound(new { message = $"Orden de Trabajo #{id} no encontrada" });

        var nuevoEstado = request.Estado?.Trim() ?? ot.Estado;

        // Validación estricta para Finalizado
        if (string.Equals(nuevoEstado, "Finalizado", StringComparison.OrdinalIgnoreCase))
        {
            var solucion = request.SolucionRealizada?.Trim() ?? ot.SolucionRealizada?.Trim();
            if (string.IsNullOrWhiteSpace(solucion))
            {
                return BadRequest(new { message = "Para finalizar la OT es obligatorio ingresar la solución realizada." });
            }
            ot.SolucionRealizada = solucion;
        }

        if (!string.IsNullOrWhiteSpace(request.Observaciones))
        {
            ot.Observaciones = request.Observaciones.Trim();
        }

        var estadoAnterior = ot.Estado;
        ot.Estado = nuevoEstado;
        ot.UpdatedAt = DateTime.UtcNow;

        var sol = ot.SolucionRealizada ?? "N/A";
        var bitacora = new RegistroBitacoraOt
        {
            Id = Guid.NewGuid(),
            OrdenTrabajoId = ot.Id,
            TipoOperacion = "CAMBIO_ESTADO",
            DetalleCambio = $"Cambio de estado: '{estadoAnterior}' -> '{nuevoEstado}'. Solución: {sol}",
            FechaHora = DateTime.UtcNow
        };
        _context.BitacoraOt.Add(bitacora);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Estado actualizado exitosamente", estado = ot.Estado });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var ot = await _context.OrdenesTrabajo
            .IgnoreQueryFilters()
            .Include(o => o.Bitacora)
            .Include(o => o.Egresos)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (ot == null) return NotFound(new { message = $"Orden de Trabajo #{id} no encontrada" });

        var isPending = string.Equals(ot.Estado, "Pendiente", StringComparison.OrdinalIgnoreCase);
        var isUnder24Hours = (DateTime.UtcNow - ot.CreatedAt).TotalHours < 24;

        if (isPending && isUnder24Hours)
        {
            // RF04 - Hard delete permitido dentro de 24hs pendientes
            _context.OrdenesTrabajo.Remove(ot);
            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = "Orden de Trabajo eliminada físicamente (Baja ejecutada por estar en estado 'Pendiente' con menos de 24 horas)",
                tipoBaja = "BAJA_FISICA"
            });
        }
        else
        {
            // RF04 - Baja Lógica (Soft Delete)
            ot.DeletedAt = DateTime.UtcNow;
            ot.Estado = "Cancelado";
            ot.UpdatedAt = DateTime.UtcNow;

            var horasAntiguedad = (DateTime.UtcNow - ot.CreatedAt).TotalHours;
            var bitacora = new RegistroBitacoraOt
            {
                Id = Guid.NewGuid(),
                OrdenTrabajoId = ot.Id,
                TipoOperacion = "BAJA_LOGICA",
                DetalleCambio = $"Baja lógica ejecutada el {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC. Motivo: Antigüedad >24hs ({horasAntiguedad:F1}hs) o estado no Pendiente.",
                FechaHora = DateTime.UtcNow
            };
            _context.BitacoraOt.Add(bitacora);

            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = "Orden de Trabajo dada de baja lógicamente (Soft Delete). Se canceló y ocultó de las vistas activas.",
                tipoBaja = "BAJA_LOGICA"
            });
        }
    }

    private static OtDto MapToDto(OrdenTrabajo o)
    {
        var ufDisplay = "";
        var sector = "";
        string? piso = null;
        string? depto = null;

        if (o.UnidadFuncional != null)
        {
            ufDisplay = o.UnidadFuncional.DisplayNombre;
            sector = o.UnidadFuncional.SectorEscalera;
            piso = o.UnidadFuncional.Piso;
            depto = o.UnidadFuncional.Depto;
        }

        return new OtDto
        {
            IdOt = o.Id,
            NumeroOT = o.NumeroOT,
            UnidadFuncionalId = o.UnidadFuncionalId,
            UnidadFuncionalDisplay = ufDisplay,
            SectorEscalera = sector,
            Piso = piso,
            Depto = depto,
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
            InsumosConsumidos = o.Egresos.Select(e => new OtEgresoItemDto
            {
                Id = e.Id,
                ArticuloId = e.ArticuloId,
                ArticuloNombre = e.Articulo?.Nombre ?? "",
                UnidadMedida = e.Articulo?.UnidadMedida ?? "",
                Cantidad = e.Cantidad,
                FechaHora = e.FechaHora,
                UsuarioNombre = e.Usuario?.NombreCompleto ?? "",
                Observacion = e.Observacion
            }).ToList(),
            Bitacora = o.Bitacora.OrderByDescending(b => b.FechaHora).Select(b => new OtBitacoraItemDto
            {
                Id = b.Id,
                TipoOperacion = b.TipoOperacion,
                DetalleCambio = b.DetalleCambio,
                FechaHora = b.FechaHora
            }).ToList()
        };
    }
}
