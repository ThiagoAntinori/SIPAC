using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("empleados")]
public class Empleado
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("nombre_completo")]
    public string NombreCompleto { get; set; } = string.Empty;

    // Alias para compatibilidad con código existente que use .Nombre
    [NotMapped]
    public string Nombre
    {
        get => NombreCompleto;
        set => NombreCompleto = value;
    }

    [Column("legajo")]
    public string? Legajo { get; set; }

    [Column("puesto_sector")]
    public string? PuestoSector { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("usuario")]
    [MaxLength(50)]
    public string? Usuario { get; set; }

    [Column("email")]
    [MaxLength(150)]
    public string? Email { get; set; }

    [Column("pin_hash")]
    [MaxLength(255)]
    public string? PinHash { get; set; }

    [Column("token_alta_pin")]
    [MaxLength(255)]
    public string? TokenAltaPin { get; set; }

    [Column("token_alta_expira")]
    public DateTime? TokenAltaExpira { get; set; }

    public ICollection<OrdenTrabajo> OrdenesTrabajo { get; set; } = new List<OrdenTrabajo>();
    public ICollection<SuscripcionPush> SuscripcionesPush { get; set; } = new List<SuscripcionPush>();
}
