namespace SIPAC.API.Entities;

public class AuditLog
{
    public int Id { get; set; }
    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public long? ModelId { get; set; }
    public string? ValoresAnteriores { get; set; }
    public string? ValoresNuevos { get; set; }
    public string? IP { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
