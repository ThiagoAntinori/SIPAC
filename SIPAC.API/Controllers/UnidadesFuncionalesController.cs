using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.OrdenesTrabajo;
using SIPAC.API.DTOs.UnidadesFuncionales;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UnidadesFuncionalesController : ControllerBase
{
    private readonly SipacDbContext _context;

    public UnidadesFuncionalesController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<UnidadFuncionalDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? sector,
        [FromQuery] string? piso)
    {
        var query = _context.UnidadesFuncionales.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(sector))
        {
            var s = sector.Trim().ToLower();
            query = query.Where(u => u.SectorEscalera.ToLower() == s);
        }

        if (!string.IsNullOrWhiteSpace(piso))
        {
            var p = piso.Trim().ToLower();
            query = query.Where(u => u.Piso != null && u.Piso.ToLower() == p);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                u.Id.ToString().Contains(s) ||
                u.SectorEscalera.ToLower().Contains(s) ||
                (u.Piso != null && u.Piso.ToLower().Contains(s)) ||
                (u.Depto != null && u.Depto.ToLower().Contains(s)));
        }

        var list = await query
            .OrderBy(u => u.SectorEscalera)
            .ThenBy(u => u.Piso)
            .ThenBy(u => u.Depto)
            .ThenBy(u => u.Id)
            .Select(u => new UnidadFuncionalDto
            {
                Id = u.Id,
                SectorEscalera = u.SectorEscalera,
                Piso = u.Piso,
                Depto = u.Depto,
                DisplayNombre = u.SectorEscalera.ToUpper() == "LOCAL"
                    ? $"LOCAL Nº {u.Piso}"
                    : $"UF {u.Id} (Sec {u.SectorEscalera} - {u.Piso} \"{u.Depto}\")",
                EsLocal = u.SectorEscalera.ToUpper() == "LOCAL"
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("sectores")]
    public async Task<ActionResult<List<string>>> GetSectores()
    {
        var sectores = await _context.UnidadesFuncionales
            .AsNoTracking()
            .Select(u => u.SectorEscalera)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync();

        return Ok(sectores);
    }

    [HttpGet("pisos")]
    public async Task<ActionResult<List<string>>> GetPisos([FromQuery] string sector)
    {
        if (string.IsNullOrWhiteSpace(sector))
            return BadRequest(new { message = "El parámetro sector es requerido" });

        var s = sector.Trim().ToLower();
        var pisos = await _context.UnidadesFuncionales
            .AsNoTracking()
            .Where(u => u.SectorEscalera.ToLower() == s && u.Piso != null)
            .Select(u => u.Piso!)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync();

        return Ok(pisos);
    }

    [HttpGet("deptos")]
    public async Task<ActionResult<List<UnidadFuncionalDto>>> GetDeptos(
        [FromQuery] string sector,
        [FromQuery] string? piso)
    {
        if (string.IsNullOrWhiteSpace(sector))
            return BadRequest(new { message = "El parámetro sector es requerido" });

        var s = sector.Trim().ToLower();
        var query = _context.UnidadesFuncionales
            .AsNoTracking()
            .Where(u => u.SectorEscalera.ToLower() == s);

        if (!string.IsNullOrWhiteSpace(piso))
        {
            var p = piso.Trim().ToLower();
            query = query.Where(u => u.Piso != null && u.Piso.ToLower() == p);
        }

        var list = await query
            .OrderBy(u => u.Depto)
            .ThenBy(u => u.Id)
            .Select(u => new UnidadFuncionalDto
            {
                Id = u.Id,
                SectorEscalera = u.SectorEscalera,
                Piso = u.Piso,
                Depto = u.Depto,
                DisplayNombre = u.SectorEscalera.ToUpper() == "LOCAL"
                    ? $"LOCAL Nº {u.Piso}"
                    : $"UF {u.Id} (Sec {u.SectorEscalera} - {u.Piso} \"{u.Depto}\")",
                EsLocal = u.SectorEscalera.ToUpper() == "LOCAL"
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UnidadFuncionalDto>> GetById(Guid id)
    {
        var u = await _context.UnidadesFuncionales
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (u == null) return NotFound(new { message = $"Unidad Funcional #{id} no encontrada" });

        return Ok(new UnidadFuncionalDto
        {
            Id = u.Id,
            SectorEscalera = u.SectorEscalera,
            Piso = u.Piso,
            Depto = u.Depto,
            DisplayNombre = u.DisplayNombre,
            EsLocal = u.EsLocal
        });
    }

    [HttpGet("{id}/historial")]
    public async Task<ActionResult<HistorialUfResponseDto>> GetHistorial(Guid id)
    {
        var uf = await _context.UnidadesFuncionales
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (uf == null) return NotFound(new { message = $"Unidad Funcional #{id} no encontrada" });

        var ordenes = await _context.OrdenesTrabajo
            .AsNoTracking()
            .Include(o => o.Categoria)
            .Include(o => o.Responsable)
            .Include(o => o.Egresos).ThenInclude(e => e.Articulo)
            .Include(o => o.Egresos).ThenInclude(e => e.Usuario)
            .Where(o => o.UnidadFuncionalId == id)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var reclamosDto = ordenes.Select(o => new HistorialOtItemDto
        {
            IdOt = o.Id,
            NumeroOT = o.NumeroOT,
            CategoriaNombre = o.Categoria?.Nombre ?? "",
            ResponsableNombre = o.Responsable?.NombreCompleto ?? "",
            ProblemaReportado = o.ProblemaReportado,
            SolucionRealizada = o.SolucionRealizada,
            Estado = o.Estado,
            Observaciones = o.Observaciones,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt,
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
            }).ToList()
        }).ToList();

        var response = new HistorialUfResponseDto
        {
            UnidadFuncional = new UnidadFuncionalDto
            {
                Id = uf.Id,
                SectorEscalera = uf.SectorEscalera,
                Piso = uf.Piso,
                Depto = uf.Depto,
                DisplayNombre = uf.DisplayNombre,
                EsLocal = uf.EsLocal
            },
            TotalReclamos = reclamosDto.Count,
            Reclamos = reclamosDto
        };

        return Ok(response);
    }
}
