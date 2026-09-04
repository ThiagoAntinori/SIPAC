using System.ComponentModel.DataAnnotations;

namespace SIPAC.API.DTOs.Usuarios;

public class UsuarioDto
{
    public int Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public bool Activo { get; set; }
}

public class CrearUsuarioDto
{
    [Required(ErrorMessage = "El nombre completo es obligatorio")]
    [MaxLength(100)]
    public string NombreCompleto { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre de usuario es obligatorio")]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es obligatoria")]
    [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "El rol es obligatorio")]
    public string Rol { get; set; } = "Pañolero";

    public bool Activo { get; set; } = true;
}

public class ActualizarUsuarioDto
{
    [Required(ErrorMessage = "El nombre completo es obligatorio")]
    [MaxLength(100)]
    public string NombreCompleto { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre de usuario es obligatorio")]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "El rol es obligatorio")]
    public string Rol { get; set; } = "Pañolero";

    public bool Activo { get; set; } = true;
}

public class CambiarPasswordDto
{
    [Required(ErrorMessage = "La nueva contraseña es obligatoria")]
    [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
    public string NuevaPassword { get; set; } = string.Empty;
}

