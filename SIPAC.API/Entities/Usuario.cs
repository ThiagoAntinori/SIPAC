using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("usuarios")]
public class Usuario
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("nombre_completo")]
    public string NombreCompleto { get; set; } = string.Empty;

    [Column("username")]
    public string Username { get; set; } = string.Empty;

    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("rol")]
    public string Rol { get; set; } = "Pañolero";

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("refresh_token")]
    public string? RefreshToken { get; set; }

    [Column("refresh_token_expiry_time")]
    public DateTime? RefreshTokenExpiryTime { get; set; }

    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<EgresoConsumo> Egresos { get; set; } = new List<EgresoConsumo>();
    public ICollection<Compra> Compras { get; set; } = new List<Compra>();
    public ICollection<AjusteInventario> Ajustes { get; set; } = new List<AjusteInventario>();
}

