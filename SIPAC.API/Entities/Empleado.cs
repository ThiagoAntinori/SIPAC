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

    public ICollection<OrdenTrabajo> OrdenesTrabajo { get; set; } = new List<OrdenTrabajo>();
}
