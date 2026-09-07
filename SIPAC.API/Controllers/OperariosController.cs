using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Operarios;
using SIPAC.API.Entities;
using SIPAC.API.Services;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OperariosController : ControllerBase
{
    private readonly SipacDbContext _context;
    private readonly AuthService _authService;
    private readonly NotificacionService _notificacionService;
    private readonly IConfiguration _configuration;

    public OperariosController(
        SipacDbContext context,
        AuthService authService,
        NotificacionService notificacionService,
        IConfiguration configuration)
    {
        _context = context;
        _authService = authService;
        _notificacionService = notificacionService;
        _configuration = configuration;
    }

    // ── GESTIÓN DE ACCESOS Y ACTIVACIÓN (ADMIN) ──────────────────────────────

    [Authorize]
    [HttpPost("{id}/habilitar-acceso")]
    public async Task<ActionResult<HabilitarAccesoResponse>> HabilitarAcceso(Guid id, [FromBody] HabilitarAccesoRequest request)
    {
        var empleado = await _context.Empleados.FindAsync(id);
        if (empleado == null)
            return NotFound(new { message = $"Empleado #{id} no encontrado." });

        if (string.IsNullOrWhiteSpace(empleado.Usuario))
        {
            empleado.Usuario = await GenerarNombreUsuarioUnicoAsync(empleado.NombreCompleto, empleado.Id);
        }

        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var token = Convert.ToHexString(tokenBytes).ToLowerInvariant();

        empleado.Email = request.Email.Trim().ToLowerInvariant();
        empleado.TokenAltaPin = token;
        empleado.TokenAltaExpira = DateTime.UtcNow.AddHours(48);

        await _context.SaveChangesAsync();

        var appUrl = Environment.GetEnvironmentVariable("APP_URL")
            ?? _configuration["AppUrl"]
            ?? "http://localhost:5173";
        appUrl = appUrl.TrimEnd('/');

        var activationUrl = $"{appUrl}/activar-pin?token={token}";

        var emailEnviado = await _notificacionService.SendPinActivationEmailAsync(
            empleado.Email,
            empleado.NombreCompleto,
            empleado.Usuario,
            activationUrl
        );

        return Ok(new HabilitarAccesoResponse
        {
            Id = empleado.Id,
            NombreCompleto = empleado.NombreCompleto,
            Usuario = empleado.Usuario,
            Email = empleado.Email,
            Token = token,
            ActivationUrl = activationUrl,
            EmailEnviado = emailEnviado
        });
    }

    [AllowAnonymous]
    [HttpGet("validar-token-pin")]
    public async Task<ActionResult<ValidarTokenPinResponse>> ValidarTokenPin([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new ValidarTokenPinResponse { Valido = false, Mensaje = "El token es obligatorio." });

        var empleado = await _context.Empleados
            .FirstOrDefaultAsync(e => e.TokenAltaPin == token.Trim());

        if (empleado == null)
            return NotFound(new ValidarTokenPinResponse { Valido = false, Mensaje = "El enlace de activación es inválido o ya fue utilizado." });

        if (!empleado.TokenAltaExpira.HasValue || empleado.TokenAltaExpira.Value < DateTime.UtcNow)
            return BadRequest(new ValidarTokenPinResponse { Valido = false, Mensaje = "El enlace de activación ha expirado. Solicite uno nuevo." });

        if (!empleado.Activo)
            return BadRequest(new ValidarTokenPinResponse { Valido = false, Mensaje = "El usuario se encuentra inactivo." });

        return Ok(new ValidarTokenPinResponse
        {
            Valido = true,
            NombreOperario = empleado.NombreCompleto,
            Usuario = empleado.Usuario ?? ""
        });
    }

    [AllowAnonymous]
    [HttpPost("activar-pin")]
    public async Task<ActionResult> ActivarPin([FromBody] ActivarPinRequest request)
    {
        var empleado = await _context.Empleados
            .FirstOrDefaultAsync(e => e.TokenAltaPin == request.Token.Trim());

        if (empleado == null)
            return NotFound(new { message = "El enlace de activación es inválido o ya fue utilizado." });

        if (!empleado.TokenAltaExpira.HasValue || empleado.TokenAltaExpira.Value < DateTime.UtcNow)
            return BadRequest(new { message = "El enlace de activación ha expirado. Solicite uno nuevo al administrador." });

        if (!empleado.Activo)
            return BadRequest(new { message = "El operario se encuentra inactivo." });

        empleado.PinHash = _authService.HashPassword(request.Pin);
        empleado.TokenAltaPin = null;
        empleado.TokenAltaExpira = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = "PIN numérico de 4 dígitos configurado exitosamente. Ya puede iniciar sesión." });
    }

    // ── AUTENTICACIÓN MÓVIL POR PIN ──────────────────────────────────────────

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginOperarioResponse>> LoginOperario([FromBody] LoginOperarioRequest request)
    {
        var usuarioTrimmed = request.Usuario.Trim().ToLowerInvariant();

        var empleado = await _context.Empleados
            .FirstOrDefaultAsync(e => e.Usuario != null && e.Usuario.ToLower() == usuarioTrimmed);

        if (empleado == null || !empleado.Activo)
            return Unauthorized(new { message = "Usuario o PIN inválido." });

        if (string.IsNullOrWhiteSpace(empleado.PinHash))
            return Unauthorized(new { message = "Este operario no tiene PIN configurado. Active su cuenta mediante el enlace enviado por email." });

        if (!_authService.VerifyPassword(request.Pin, empleado.PinHash))
            return Unauthorized(new { message = "Usuario o PIN inválido." });

        var token = _authService.GenerateJwtTokenForOperario(empleado);

        return Ok(new LoginOperarioResponse
        {
            Token = token,
            Operario = new OperarioPerfilDto
            {
                Id = empleado.Id,
                NombreCompleto = empleado.NombreCompleto,
                Usuario = empleado.Usuario!,
                Email = empleado.Email,
                Legajo = empleado.Legajo,
                PuestoSector = empleado.PuestoSector,
                Rol = "Operario"
            }
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<OperarioPerfilDto>> GetCurrentUser()
    {
        var operarioId = GetCurrentOperarioId();
        if (operarioId == null)
            return Unauthorized(new { message = "Identidad de operario no válida." });

        var empleado = await _context.Empleados.FindAsync(operarioId.Value);
        if (empleado == null || !empleado.Activo)
            return NotFound(new { message = "Operario no encontrado o inactivo." });

        return Ok(new OperarioPerfilDto
        {
            Id = empleado.Id,
            NombreCompleto = empleado.NombreCompleto,
            Usuario = empleado.Usuario ?? "",
            Email = empleado.Email,
            Legajo = empleado.Legajo,
            PuestoSector = empleado.PuestoSector,
            Rol = "Operario"
        });
    }

    // ── OPERATIVA MÓVIL DE TAREAS ────────────────────────────────────────────

    [Authorize]
    [HttpGet("mis-tareas")]
    public async Task<ActionResult<List<MisTareasDto>>> GetMisTareas()
    {
        var operarioId = GetCurrentOperarioId();
        if (operarioId == null)
            return Unauthorized();

        var estadosActivos = new[]
        {
            "Pendiente",
            "En Proceso",
            "Pendiente Aprobacion Finalizacion",
            "Pendiente Aprobacion Suspension"
        };

        var tareas = await _context.OrdenesTrabajo
            .AsNoTracking()
            .Include(o => o.UnidadFuncional)
            .Include(o => o.Categoria)
            .Where(o => o.ResponsableId == operarioId.Value && estadosActivos.Contains(o.Estado))
            .OrderBy(o => o.LeidaPorOperario ? 1 : 0) // No leídas primero
            .ThenByDescending(o => o.CreatedAt)
            .Select(o => new MisTareasDto
            {
                IdOt = o.Id,
                NumeroOT = o.NumeroOT,
                UnidadFuncionalId = o.UnidadFuncionalId,
                UnidadFuncionalDisplay = o.UnidadFuncional != null ? o.UnidadFuncional.DisplayNombre : "UF",
                SectorEscalera = o.UnidadFuncional != null ? o.UnidadFuncional.SectorEscalera : "",
                Piso = o.UnidadFuncional != null ? o.UnidadFuncional.Piso : null,
                Depto = o.UnidadFuncional != null ? o.UnidadFuncional.Depto : null,
                CategoriaId = o.CategoriaId,
                CategoriaNombre = o.Categoria != null ? o.Categoria.Nombre : "",
                ProblemaReportado = o.ProblemaReportado,
                SolucionRealizada = o.SolucionRealizada,
                MotivoSuspension = o.MotivoSuspension,
                Estado = o.Estado,
                LeidaPorOperario = o.LeidaPorOperario,
                Observaciones = o.Observaciones,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                DiasPendiente = o.DiasPendiente
            })
            .ToListAsync();

        return Ok(tareas);
    }

    [Authorize]
    [HttpGet("historial")]
    public async Task<ActionResult<HistorialOperarioResponseDto>> GetHistorial(
        [FromQuery] string? estado,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var operarioId = GetCurrentOperarioId();
        if (operarioId == null)
            return Unauthorized();

        var estadosHistorial = new[] { "Finalizado", "Suspendido" };

        var query = _context.OrdenesTrabajo
            .AsNoTracking()
            .Include(o => o.UnidadFuncional)
            .Include(o => o.Categoria)
            .Where(o => o.ResponsableId == operarioId.Value);

        if (!string.IsNullOrWhiteSpace(estado))
        {
            var estTrimmed = estado.Trim();
            query = query.Where(o => o.Estado.ToLower() == estTrimmed.ToLower());
        }
        else
        {
            query = query.Where(o => estadosHistorial.Contains(o.Estado));
        }

        if (desde.HasValue)
        {
            query = query.Where(o => o.CreatedAt >= desde.Value);
        }

        if (hasta.HasValue)
        {
            query = query.Where(o => o.CreatedAt <= hasta.Value);
        }

        var totalCount = await query.CountAsync();

        var pageNum = Math.Max(1, page);
        var size = Math.Clamp(pageSize, 1, 50);

        var items = await query
            .OrderByDescending(o => o.UpdatedAt)
            .Skip((pageNum - 1) * size)
            .Take(size)
            .Select(o => new MisTareasDto
            {
                IdOt = o.Id,
                NumeroOT = o.NumeroOT,
                UnidadFuncionalId = o.UnidadFuncionalId,
                UnidadFuncionalDisplay = o.UnidadFuncional != null ? o.UnidadFuncional.DisplayNombre : "UF",
                SectorEscalera = o.UnidadFuncional != null ? o.UnidadFuncional.SectorEscalera : "",
                Piso = o.UnidadFuncional != null ? o.UnidadFuncional.Piso : null,
                Depto = o.UnidadFuncional != null ? o.UnidadFuncional.Depto : null,
                CategoriaId = o.CategoriaId,
                CategoriaNombre = o.Categoria != null ? o.Categoria.Nombre : "",
                ProblemaReportado = o.ProblemaReportado,
                SolucionRealizada = o.SolucionRealizada,
                MotivoSuspension = o.MotivoSuspension,
                Estado = o.Estado,
                LeidaPorOperario = o.LeidaPorOperario,
                Observaciones = o.Observaciones,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                DiasPendiente = 0
            })
            .ToListAsync();

        return Ok(new HistorialOperarioResponseDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = pageNum,
            PageSize = size
        });
    }

    [Authorize]
    [HttpPatch("tareas/{id}/marcar-leida")]
    public async Task<ActionResult> MarcarLeida(Guid id)
    {
        var operarioId = GetCurrentOperarioId();
        if (operarioId == null)
            return Unauthorized();

        var ot = await _context.OrdenesTrabajo.FirstOrDefaultAsync(o => o.Id == id);
        if (ot == null) return NotFound(new { message = $"OT #{id} no encontrada" });

        if (ot.ResponsableId != operarioId.Value && !User.IsInRole("Admin"))
            return Forbid();

        ot.LeidaPorOperario = true;
        ot.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Orden de trabajo marcada como leída." });
    }

    [Authorize]
    [HttpPatch("tareas/{id}/iniciar")]
    public async Task<ActionResult> IniciarTarea(Guid id)
    {
        var operarioId = GetCurrentOperarioId();
        if (operarioId == null)
            return Unauthorized();

        var ot = await _context.OrdenesTrabajo.FirstOrDefaultAsync(o => o.Id == id);
        if (ot == null) return NotFound(new { message = $"OT #{id} no encontrada" });

        if (ot.ResponsableId != operarioId.Value && !User.IsInRole("Admin"))
            return Forbid();

        ot.Estado = "En Proceso";
        ot.LeidaPorOperario = true;
        ot.UpdatedAt = DateTime.UtcNow;

        var bitacora = new RegistroBitacoraOt
        {
            Id = Guid.NewGuid(),
            OrdenTrabajoId = ot.Id,
            TipoOperacion = "INICIO_TAREA",
            DetalleCambio = "El operario inició el trabajo en campo (Estado: 'En Proceso').",
            FechaHora = DateTime.UtcNow
        };
        _context.BitacoraOt.Add(bitacora);

        await _context.SaveChangesAsync();
        return Ok(new { message = "Tarea iniciada con éxito.", estado = ot.Estado });
    }

    [Authorize]
    [HttpPatch("tareas/{id}/elevar-finalizacion")]
    public async Task<ActionResult> ElevarFinalizacion(Guid id, [FromBody] ElevarFinalizacionRequest request)
    {
        var operarioId = GetCurrentOperarioId();
        if (operarioId == null)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.SolucionRealizada))
            return BadRequest(new { message = "Es obligatorio detallar la solución realizada para elevar la finalización." });

        var ot = await _context.OrdenesTrabajo.FirstOrDefaultAsync(o => o.Id == id);
        if (ot == null) return NotFound(new { message = $"OT #{id} no encontrada" });

        if (ot.ResponsableId != operarioId.Value && !User.IsInRole("Admin"))
            return Forbid();

        ot.SolucionRealizada = request.SolucionRealizada.Trim();
        ot.Estado = "Pendiente Aprobacion Finalizacion";
        ot.LeidaPorOperario = true;
        ot.UpdatedAt = DateTime.UtcNow;

        var bitacora = new RegistroBitacoraOt
        {
            Id = Guid.NewGuid(),
            OrdenTrabajoId = ot.Id,
            TipoOperacion = "ELEVACION_FINALIZACION",
            DetalleCambio = $"Operario elevó tarea para aprobación de cierre. Solución informada: {ot.SolucionRealizada}",
            FechaHora = DateTime.UtcNow
        };
        _context.BitacoraOt.Add(bitacora);

        await _context.SaveChangesAsync();
        return Ok(new { message = "Tarea elevada para aprobación formal de cierre.", estado = ot.Estado });
    }

    [Authorize]
    [HttpPatch("tareas/{id}/elevar-suspension")]
    public async Task<ActionResult> ElevarSuspension(Guid id, [FromBody] ElevarSuspensionRequest request)
    {
        var operarioId = GetCurrentOperarioId();
        if (operarioId == null)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.MotivoSuspension))
            return BadRequest(new { message = "Es obligatorio indicar el motivo del inconveniente o suspensión." });

        var ot = await _context.OrdenesTrabajo.FirstOrDefaultAsync(o => o.Id == id);
        if (ot == null) return NotFound(new { message = $"OT #{id} no encontrada" });

        if (ot.ResponsableId != operarioId.Value && !User.IsInRole("Admin"))
            return Forbid();

        ot.MotivoSuspension = request.MotivoSuspension.Trim();
        ot.Estado = "Pendiente Aprobacion Suspension";
        ot.LeidaPorOperario = true;
        ot.UpdatedAt = DateTime.UtcNow;

        var bitacora = new RegistroBitacoraOt
        {
            Id = Guid.NewGuid(),
            OrdenTrabajoId = ot.Id,
            TipoOperacion = "ELEVACION_SUSPENSION",
            DetalleCambio = $"Operario elevó solicitud de suspensión. Motivo informado: {ot.MotivoSuspension}",
            FechaHora = DateTime.UtcNow
        };
        _context.BitacoraOt.Add(bitacora);

        await _context.SaveChangesAsync();
        return Ok(new { message = "Solicitud de suspensión elevada al superior.", estado = ot.Estado });
    }

    // ── HELPERS PRIVADOS ─────────────────────────────────────────────────────

    private Guid? GetCurrentOperarioId()
    {
        var operarioClaim = User.FindFirst("OperarioId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (Guid.TryParse(operarioClaim, out var guid))
            return guid;

        return null;
    }

    private async Task<string> GenerarNombreUsuarioUnicoAsync(string nombreCompleto, Guid idExcluir)
    {
        // Quitar acentos y caracteres especiales
        var normalized = RemoveDiacritics(nombreCompleto.Trim().ToLowerInvariant());
        var parts = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        string baseUsername;
        if (parts.Length >= 2)
        {
            var inicial = parts[0][..1];
            var apellido = parts[^1];
            baseUsername = $"{inicial}{apellido}";
        }
        else if (parts.Length == 1)
        {
            baseUsername = parts[0];
        }
        else
        {
            baseUsername = "operario";
        }

        // Limpiar para dejar solo caracteres a-z y 0-9
        var sb = new StringBuilder();
        foreach (var c in baseUsername)
        {
            if (char.IsLetterOrDigit(c))
                sb.Append(c);
        }
        var candidate = sb.Length > 0 ? sb.ToString() : "operario";

        // Asegurar unicidad
        var finalUsername = candidate;
        var suffix = 1;

        while (await _context.Empleados.AnyAsync(e => e.Id != idExcluir && e.Usuario != null && e.Usuario.ToLower() == finalUsername.ToLower()))
        {
            finalUsername = $"{candidate}{suffix}";
            suffix++;
        }

        return finalUsername;
    }

    private static string RemoveDiacritics(string text)
    {
        var normalizedString = text.Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder(capacity: normalizedString.Length);

        for (int i = 0; i < normalizedString.Length; i++)
        {
            char c = normalizedString[i];
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                stringBuilder.Append(c);
            }
        }

        return stringBuilder.ToString().Normalize(NormalizationForm.FormC);
    }
}
