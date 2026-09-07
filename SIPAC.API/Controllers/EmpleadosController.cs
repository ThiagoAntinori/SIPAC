using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Empleados;
using SIPAC.API.Entities;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmpleadosController : ControllerBase
{
    private readonly SipacDbContext _context;

    public EmpleadosController(SipacDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<EmpleadoDto>>> GetAll([FromQuery] bool soloActivos = true)
    {
        var query = _context.Empleados.AsNoTracking().AsQueryable();
        if (soloActivos) query = query.Where(e => e.Activo);

        var now = DateTime.UtcNow;
        var list = await query
            .OrderBy(e => e.NombreCompleto)
            .Select(e => new EmpleadoDto
            {
                Id = e.Id,
                NombreCompleto = e.NombreCompleto,
                Legajo = e.Legajo ?? "",
                PuestoSector = e.PuestoSector ?? "",
                Activo = e.Activo,
                CantidadOrdenes = e.OrdenesTrabajo.Count,
                Usuario = e.Usuario,
                Email = e.Email,
                TienePin = !string.IsNullOrEmpty(e.PinHash),
                PendienteActivacion = !string.IsNullOrEmpty(e.TokenAltaPin) && e.TokenAltaExpira > now,
                EstadoAccesoMovil = !string.IsNullOrEmpty(e.PinHash)
                    ? "Activo"
                    : (!string.IsNullOrEmpty(e.TokenAltaPin) && e.TokenAltaExpira > now ? "Pendiente" : "Sin Acceso")
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EmpleadoDto>> GetById(Guid id)
    {
        var now = DateTime.UtcNow;
        var empleado = await _context.Empleados
            .AsNoTracking()
            .Include(e => e.OrdenesTrabajo)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (empleado == null) return NotFound(new { message = $"Empleado #{id} no encontrado" });

        return Ok(new EmpleadoDto
        {
            Id = empleado.Id,
            NombreCompleto = empleado.NombreCompleto,
            Legajo = empleado.Legajo ?? "",
            PuestoSector = empleado.PuestoSector ?? "",
            Activo = empleado.Activo,
            CantidadOrdenes = empleado.OrdenesTrabajo.Count,
            Usuario = empleado.Usuario,
            Email = empleado.Email,
            TienePin = !string.IsNullOrEmpty(empleado.PinHash),
            PendienteActivacion = !string.IsNullOrEmpty(empleado.TokenAltaPin) && empleado.TokenAltaExpira > now,
            EstadoAccesoMovil = !string.IsNullOrEmpty(empleado.PinHash)
                ? "Activo"
                : (!string.IsNullOrEmpty(empleado.TokenAltaPin) && empleado.TokenAltaExpira > now ? "Pendiente" : "Sin Acceso")
        });
    }

    [HttpPost]
    public async Task<ActionResult<EmpleadoDto>> Create([FromBody] CreateEmpleadoDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NombreCompleto))
            return BadRequest(new { message = "El nombre completo es requerido" });

        var legajoTrimmed = request.Legajo?.Trim();
        if (!string.IsNullOrWhiteSpace(legajoTrimmed) &&
            await _context.Empleados.AnyAsync(e => e.Legajo != null && e.Legajo.ToLower() == legajoTrimmed.ToLower()))
        {
            return BadRequest(new { message = "El legajo ya está registrado" });
        }

        var usuarioTrimmed = request.Usuario?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(usuarioTrimmed))
        {
            if (usuarioTrimmed.Length > 50)
                return BadRequest(new { message = "El nombre de usuario no puede superar los 50 caracteres" });

            if (await _context.Empleados.AnyAsync(e => e.Usuario != null && e.Usuario.ToLower() == usuarioTrimmed))
            {
                return BadRequest(new { message = $"El nombre de usuario '{usuarioTrimmed}' ya está registrado por otro empleado" });
            }
        }

        var emailTrimmed = request.Email?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(emailTrimmed))
        {
            if (emailTrimmed.Length > 150)
                return BadRequest(new { message = "El correo electrónico no puede superar los 150 caracteres" });

            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(emailTrimmed))
                return BadRequest(new { message = "El formato del correo electrónico es inválido" });

            if (await _context.Empleados.AnyAsync(e => e.Email != null && e.Email.ToLower() == emailTrimmed))
            {
                return BadRequest(new { message = $"El correo electrónico '{emailTrimmed}' ya está registrado por otro empleado" });
            }
        }

        var empleado = new Empleado
        {
            Id = Guid.NewGuid(),
            NombreCompleto = request.NombreCompleto.Trim(),
            Legajo = string.IsNullOrWhiteSpace(legajoTrimmed) ? null : legajoTrimmed,
            PuestoSector = string.IsNullOrWhiteSpace(request.PuestoSector) ? null : request.PuestoSector.Trim(),
            Usuario = string.IsNullOrWhiteSpace(usuarioTrimmed) ? null : usuarioTrimmed,
            Email = string.IsNullOrWhiteSpace(emailTrimmed) ? null : emailTrimmed,
            Activo = request.Activo
        };

        _context.Empleados.Add(empleado);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = empleado.Id }, new EmpleadoDto
        {
            Id = empleado.Id,
            NombreCompleto = empleado.NombreCompleto,
            Legajo = empleado.Legajo ?? "",
            PuestoSector = empleado.PuestoSector ?? "",
            Usuario = empleado.Usuario,
            Email = empleado.Email,
            Activo = empleado.Activo,
            CantidadOrdenes = 0,
            EstadoAccesoMovil = "Sin Acceso"
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<EmpleadoDto>> Update(Guid id, [FromBody] UpdateEmpleadoDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NombreCompleto))
            return BadRequest(new { message = "El nombre completo es requerido" });

        var empleado = await _context.Empleados
            .Include(e => e.OrdenesTrabajo)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (empleado == null) return NotFound(new { message = $"Empleado #{id} no encontrado" });

        var legajoTrimmed = request.Legajo?.Trim();
        if (!string.IsNullOrWhiteSpace(legajoTrimmed) &&
            await _context.Empleados.AnyAsync(e => e.Id != id && e.Legajo != null && e.Legajo.ToLower() == legajoTrimmed.ToLower()))
        {
            return BadRequest(new { message = "El legajo ya está registrado en otro empleado" });
        }

        var usuarioTrimmed = request.Usuario?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(usuarioTrimmed))
        {
            if (usuarioTrimmed.Length > 50)
                return BadRequest(new { message = "El nombre de usuario no puede superar los 50 caracteres" });

            if (await _context.Empleados.AnyAsync(e => e.Id != id && e.Usuario != null && e.Usuario.ToLower() == usuarioTrimmed))
            {
                return BadRequest(new { message = $"El nombre de usuario '{usuarioTrimmed}' ya está registrado por otro empleado" });
            }
        }

        var emailTrimmed = request.Email?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(emailTrimmed))
        {
            if (emailTrimmed.Length > 150)
                return BadRequest(new { message = "El correo electrónico no puede superar los 150 caracteres" });

            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(emailTrimmed))
                return BadRequest(new { message = "El formato del correo electrónico es inválido" });

            if (await _context.Empleados.AnyAsync(e => e.Id != id && e.Email != null && e.Email.ToLower() == emailTrimmed))
            {
                return BadRequest(new { message = $"El correo electrónico '{emailTrimmed}' ya está registrado por otro empleado" });
            }
        }

        empleado.NombreCompleto = request.NombreCompleto.Trim();
        empleado.Legajo = string.IsNullOrWhiteSpace(legajoTrimmed) ? null : legajoTrimmed;
        empleado.PuestoSector = string.IsNullOrWhiteSpace(request.PuestoSector) ? null : request.PuestoSector.Trim();
        empleado.Usuario = string.IsNullOrWhiteSpace(usuarioTrimmed) ? null : usuarioTrimmed;
        empleado.Email = string.IsNullOrWhiteSpace(emailTrimmed) ? null : emailTrimmed;
        empleado.Activo = request.Activo;

        await _context.SaveChangesAsync();

        var now = DateTime.UtcNow;
        return Ok(new EmpleadoDto
        {
            Id = empleado.Id,
            NombreCompleto = empleado.NombreCompleto,
            Legajo = empleado.Legajo ?? "",
            PuestoSector = empleado.PuestoSector ?? "",
            Activo = empleado.Activo,
            CantidadOrdenes = empleado.OrdenesTrabajo.Count,
            Usuario = empleado.Usuario,
            Email = empleado.Email,
            TienePin = !string.IsNullOrEmpty(empleado.PinHash),
            PendienteActivacion = !string.IsNullOrEmpty(empleado.TokenAltaPin) && empleado.TokenAltaExpira > now,
            EstadoAccesoMovil = !string.IsNullOrEmpty(empleado.PinHash)
                ? "Activo"
                : (!string.IsNullOrEmpty(empleado.TokenAltaPin) && empleado.TokenAltaExpira > now ? "Pendiente" : "Sin Acceso")
        });
    }

    [HttpPatch("{id}/toggle-activo")]
    public async Task<ActionResult<EmpleadoDto>> ToggleActivo(Guid id)
    {
        var empleado = await _context.Empleados
            .Include(e => e.OrdenesTrabajo)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (empleado == null) return NotFound(new { message = $"Empleado #{id} no encontrado" });

        empleado.Activo = !empleado.Activo;
        await _context.SaveChangesAsync();

        var now = DateTime.UtcNow;
        return Ok(new EmpleadoDto
        {
            Id = empleado.Id,
            NombreCompleto = empleado.NombreCompleto,
            Legajo = empleado.Legajo ?? "",
            PuestoSector = empleado.PuestoSector ?? "",
            Activo = empleado.Activo,
            CantidadOrdenes = empleado.OrdenesTrabajo.Count,
            Usuario = empleado.Usuario,
            Email = empleado.Email,
            TienePin = !string.IsNullOrEmpty(empleado.PinHash),
            PendienteActivacion = !string.IsNullOrEmpty(empleado.TokenAltaPin) && empleado.TokenAltaExpira > now,
            EstadoAccesoMovil = !string.IsNullOrEmpty(empleado.PinHash)
                ? "Activo"
                : (!string.IsNullOrEmpty(empleado.TokenAltaPin) && empleado.TokenAltaExpira > now ? "Pendiente" : "Sin Acceso")
        });
    }
}
