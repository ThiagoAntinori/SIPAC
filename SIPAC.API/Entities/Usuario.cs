namespace SIPAC.API.Entities;

public class Usuario
{
    public int Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Rol { get; set; } = "Pañolero";
    public bool Activo { get; set; } = true;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }

    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<EgresoConsumo> Egresos { get; set; } = new List<EgresoConsumo>();
    public ICollection<Compra> Compras { get; set; } = new List<Compra>();
    public ICollection<AjusteInventario> Ajustes { get; set; } = new List<AjusteInventario>();
}
