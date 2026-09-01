using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.DTOs.Auth;
using SIPAC.API.Entities;
using SIPAC.API.Services;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly SipacDbContext _context;
    private readonly AuthService _authService;

    public AuthController(SipacDbContext context, AuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());

        if (usuario == null || !usuario.Activo || !_authService.VerifyPassword(request.Password, usuario.PasswordHash))
        {
            return Unauthorized(new { message = "Credenciales inválidas o usuario inactivo" });
        }

        var token = _authService.GenerateJwtToken(usuario);
        var refreshToken = _authService.GenerateRefreshToken();

        usuario.RefreshToken = refreshToken;
        usuario.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return Ok(new LoginResponse
        {
            Token = token,
            RefreshToken = refreshToken,
            Usuario = new UserDto
            {
                Id = usuario.Id,
                NombreCompleto = usuario.NombreCompleto,
                Username = usuario.Username,
                Rol = usuario.Rol,
                Activo = usuario.Activo
            }
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var usuario = await _context.Usuarios.FindAsync(userId);
        if (usuario == null)
            return NotFound();

        return Ok(new UserDto
        {
            Id = usuario.Id,
            NombreCompleto = usuario.NombreCompleto,
            Username = usuario.Username,
            Rol = usuario.Rol,
            Activo = usuario.Activo
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register([FromBody] RegisterRequest request)
    {
        if (await _context.Usuarios.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower()))
        {
            return BadRequest(new { message = "El nombre de usuario ya existe" });
        }

        var usuario = new Usuario
        {
            NombreCompleto = request.NombreCompleto,
            Username = request.Username,
            PasswordHash = _authService.HashPassword(request.Password),
            Rol = request.Rol,
            Activo = true
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return Ok(new UserDto
        {
            Id = usuario.Id,
            NombreCompleto = usuario.NombreCompleto,
            Username = usuario.Username,
            Rol = usuario.Rol,
            Activo = usuario.Activo
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("users")]
    public async Task<ActionResult<List<UserDto>>> GetAllUsers()
    {
        var users = await _context.Usuarios
            .Select(u => new UserDto
            {
                Id = u.Id,
                NombreCompleto = u.NombreCompleto,
                Username = u.Username,
                Rol = u.Rol,
                Activo = u.Activo
            })
            .ToListAsync();

        return Ok(users);
    }
}
