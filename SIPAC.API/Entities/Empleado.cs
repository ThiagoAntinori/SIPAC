using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("empleados")]
public class Empleado
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("nombre_completo")]
    public string NombreCompleto { get; set; } = string.Empty;

    [Column("legajo")]
    public string Legajo { get; set; } = string.Empty;

    [Column("puesto_sector")]
    public string PuestoSector { get; set; } = string.Empty;

    [Column("activo")]
    public bool Activo { get; set; } = true;
}

