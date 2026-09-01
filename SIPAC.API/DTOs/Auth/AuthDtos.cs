namespace SIPAC.API.DTOs.Auth;

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public UserDto Usuario { get; set; } = new();
}

public class UserDto
{
    public int Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public bool Activo { get; set; }
}

public class RegisterRequest
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Rol { get; set; } = "Pañolero";
}
