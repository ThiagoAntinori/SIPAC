namespace SIPAC.API.DTOs.Auditoria;

public class AuditLogDto
{
    public int Id { get; set; }
    public int? UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = "Sistema";
    public string Accion { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public long? ModelId { get; set; }
    public string? ValoresAnteriores { get; set; }
    public string? ValoresNuevos { get; set; }
    public string? IP { get; set; }
    public DateTime Timestamp { get; set; }
}
