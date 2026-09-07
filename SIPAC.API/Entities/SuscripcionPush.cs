using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("suscripciones_push")]
public class SuscripcionPush
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("responsable_id")]
    public Guid ResponsableId { get; set; }
    public Empleado? Responsable { get; set; }

    [Column("endpoint")]
    public string Endpoint { get; set; } = string.Empty;

    [Column("p256dh")]
    public string P256dh { get; set; } = string.Empty;

    [Column("auth")]
    public string Auth { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
