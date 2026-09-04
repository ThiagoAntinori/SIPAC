using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Usuarios;
using SIPAC.API.Entities;
using SIPAC.API.Services;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsuariosController : ControllerBase
{
    private readonly SipacDbContext _context;
    private readonly AuthService _authService;

    public UsuariosController(SipacDbContext context, AuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    private int? GetCurrentUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idStr, out var id) ? id : null;
    }

    [HttpGet]
    public async Task<ActionResult<List<UsuarioDto>>> GetAll(
        [FromQuery] string? search = null,
        [FromQuery] string? rol = null,
        [FromQuery] bool? soloActivos = null)
    {
        var query = _context.Usuarios.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u => u.NombreCompleto.ToLower().Contains(s) || u.Username.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(rol))
        {
            query = query.Where(u => u.Rol.ToLower() == rol.Trim().ToLower());
        }

        if (soloActivos.HasValue && soloActivos.Value)
        {
            query = query.Where(u => u.Activo);
        }

        var usuarios = await query
            .OrderBy(u => u.NombreCompleto)
            .Select(u => new UsuarioDto
            {
                Id = u.Id,
                NombreCompleto = u.NombreCompleto,
                Username = u.Username,
                Rol = u.Rol,
                Activo = u.Activo
            })
            .ToListAsync();

        return Ok(usuarios);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UsuarioDto>> GetById(int id)
    {
        var usuario = await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (usuario == null)
            return NotFound(new { message = $"Usuario #{id} no encontrado" });

        return Ok(new UsuarioDto
        {
            Id = usuario.Id,
            NombreCompleto = usuario.NombreCompleto,
            Username = usuario.Username,
            Rol = usuario.Rol,
            Activo = usuario.Activo
        });
    }

    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> Create([FromBody] CrearUsuarioDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NombreCompleto))
            return BadRequest(new { message = "El nombre completo es obligatorio" });

        if (string.IsNullOrWhiteSpace(request.Username))
            return BadRequest(new { message = "El nombre de usuario es obligatorio" });

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return BadRequest(new { message = "La contraseña debe tener al menos 6 caracteres" });

        var usernameTrimmed = request.Username.Trim();
        if (await _context.Usuarios.AnyAsync(u => u.Username.ToLower() == usernameTrimmed.ToLower()))
        {
            return BadRequest(new { message = $"El nombre de usuario '{usernameTrimmed}' ya está registrado" });
        }

        var rolValido = request.Rol?.Trim();
        if (string.IsNullOrWhiteSpace(rolValido) || 
            (rolValido != "Admin" && rolValido != "Pañolero" && rolValido != "Supervisor"))
        {
            rolValido = "Pañolero";
        }

        var usuario = new Usuario
        {
            NombreCompleto = request.NombreCompleto.Trim(),
            Username = usernameTrimmed,
            PasswordHash = _authService.HashPassword(request.Password),
            Rol = rolValido,
            Activo = request.Activo
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        var dto = new UsuarioDto
        {
            Id = usuario.Id,
            NombreCompleto = usuario.NombreCompleto,
            Username = usuario.Username,
            Rol = usuario.Rol,
            Activo = usuario.Activo
        };

        return CreatedAtAction(nameof(GetById), new { id = usuario.Id }, dto);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UsuarioDto>> Update(int id, [FromBody] ActualizarUsuarioDto request)
    {
        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario == null)
            return NotFound(new { message = $"Usuario #{id} no encontrado" });

        if (string.IsNullOrWhiteSpace(request.NombreCompleto))
            return BadRequest(new { message = "El nombre completo es obligatorio" });

        if (string.IsNullOrWhiteSpace(request.Username))
            return BadRequest(new { message = "El nombre de usuario es obligatorio" });

        var usernameTrimmed = request.Username.Trim();
        if (await _context.Usuarios.AnyAsync(u => u.Id != id && u.Username.ToLower() == usernameTrimmed.ToLower()))
        {
            return BadRequest(new { message = $"El nombre de usuario '{usernameTrimmed}' ya está en uso por otra cuenta" });
        }

        var currentUserId = GetCurrentUserId();
        if (currentUserId.HasValue && currentUserId.Value == id)
        {
            // Salvaguarda: No auto-desactivarse
            if (!request.Activo)
            {
                return BadRequest(new { message = "No puedes desactivar tu propia cuenta de administrador" });
            }

            // Salvaguarda: No auto-revocar rol Admin si es el único
            if (request.Rol != "Admin")
            {
                var otherActiveAdmins = await _context.Usuarios.AnyAsync(u => u.Id != id && u.Rol == "Admin" && u.Activo);
                if (!otherActiveAdmins)
                {
                    return BadRequest(new { message = "No puedes revocar tus permisos de Administrador ya que eres el único administrador activo del sistema" });
                }
            }
        }

        var rolValido = request.Rol?.Trim();
        if (string.IsNullOrWhiteSpace(rolValido) || 
            (rolValido != "Admin" && rolValido != "Pañolero" && rolValido != "Supervisor"))
        {
            rolValido = usuario.Rol;
        }

        usuario.NombreCompleto = request.NombreCompleto.Trim();
        usuario.Username = usernameTrimmed;
        usuario.Rol = rolValido;
        usuario.Activo = request.Activo;

        if (!usuario.Activo)
        {
            usuario.RefreshToken = null;
            usuario.RefreshTokenExpiryTime = null;
        }

        await _context.SaveChangesAsync();

        return Ok(new UsuarioDto
        {
            Id = usuario.Id,
            NombreCompleto = usuario.NombreCompleto,
            Username = usuario.Username,
            Rol = usuario.Rol,
            Activo = usuario.Activo
        });
    }

    [HttpPatch("{id}/password")]
    public async Task<ActionResult> CambiarPassword(int id, [FromBody] CambiarPasswordDto request)
    {
        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario == null)
            return NotFound(new { message = $"Usuario #{id} no encontrado" });

        if (string.IsNullOrWhiteSpace(request.NuevaPassword) || request.NuevaPassword.Length < 6)
            return BadRequest(new { message = "La nueva contraseña debe tener al menos 6 caracteres" });

        usuario.PasswordHash = _authService.HashPassword(request.NuevaPassword);
        usuario.RefreshToken = null;
        usuario.RefreshTokenExpiryTime = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Contraseña actualizada correctamente para el usuario '{usuario.Username}'" });
    }

    [HttpPatch("{id}/toggle-activo")]
    public async Task<ActionResult<UsuarioDto>> ToggleActivo(int id)
    {
        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario == null)
            return NotFound(new { message = $"Usuario #{id} no encontrado" });

        var currentUserId = GetCurrentUserId();
        if (currentUserId.HasValue && currentUserId.Value == id && usuario.Activo)
        {
            return BadRequest(new { message = "No puedes desactivar tu propia cuenta de administrador" });
        }

        if (usuario.Activo && usuario.Rol == "Admin")
        {
            var otherActiveAdmins = await _context.Usuarios.AnyAsync(u => u.Id != id && u.Rol == "Admin" && u.Activo);
            if (!otherActiveAdmins)
            {
                return BadRequest(new { message = "No se puede desactivar al único administrador activo del sistema" });
            }
        }

        usuario.Activo = !usuario.Activo;
        if (!usuario.Activo)
        {
            usuario.RefreshToken = null;
            usuario.RefreshTokenExpiryTime = null;
        }

        await _context.SaveChangesAsync();

        return Ok(new UsuarioDto
        {
            Id = usuario.Id,
            NombreCompleto = usuario.NombreCompleto,
            Username = usuario.Username,
            Rol = usuario.Rol,
            Activo = usuario.Activo
        });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario == null)
            return NotFound(new { message = $"Usuario #{id} no encontrado" });

        var currentUserId = GetCurrentUserId();
        if (currentUserId.HasValue && currentUserId.Value == id)
        {
            return BadRequest(new { message = "No puedes eliminar tu propia cuenta de administrador" });
        }

        if (usuario.Rol == "Admin")
        {
            var otherActiveAdmins = await _context.Usuarios.AnyAsync(u => u.Id != id && u.Rol == "Admin" && u.Activo);
            if (!otherActiveAdmins)
            {
                return BadRequest(new { message = "No se puede eliminar al único administrador activo del sistema" });
            }
        }

        var tieneRelaciones = await _context.EgresosConsumo.AnyAsync(e => e.UsuarioId == id) ||
                              await _context.Compras.AnyAsync(c => c.UsuarioId == id) ||
                              await _context.AjustesInventario.AnyAsync(a => a.UsuarioId == id) ||
                              await _context.AuditLogs.AnyAsync(a => a.UsuarioId == id);

        if (tieneRelaciones)
        {
            usuario.Activo = false;
            usuario.RefreshToken = null;
            usuario.RefreshTokenExpiryTime = null;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"El usuario '{usuario.Username}' posee registros históricos vinculados (egresos, compras o auditoría). Ha sido desactivado para preservar la integridad.",
                tipoBaja = "desactivado"
            });
        }

        _context.Usuarios.Remove(usuario);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Usuario '{usuario.Username}' eliminado exitosamente",
            tipoBaja = "eliminado"
        });
    }
}

