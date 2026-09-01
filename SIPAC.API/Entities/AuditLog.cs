using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("usuario_id")]
    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    [Column("accion")]
    public string Accion { get; set; } = string.Empty;

    [Column("model")]
    public string Model { get; set; } = string.Empty;

    [Column("model_id")]
    public string? ModelId { get; set; }

    [Column("valores_anteriores")]
    public string? ValoresAnteriores { get; set; }

    [Column("valores_nuevos")]
    public string? ValoresNuevos { get; set; }

    [Column("ip")]
    public string? IP { get; set; }

    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

