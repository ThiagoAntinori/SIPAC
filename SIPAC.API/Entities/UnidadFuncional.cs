using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("unidades_funcionales")]
public class UnidadFuncional
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("sector_escalera")]
    public string SectorEscalera { get; set; } = string.Empty;

    [Column("piso")]
    public string? Piso { get; set; }

    [Column("depto")]
    public string? Depto { get; set; }

    [NotMapped]
    public bool EsLocal => string.Equals(SectorEscalera, "LOCAL", StringComparison.OrdinalIgnoreCase);

    [NotMapped]
    public string DisplayNombre
    {
        get
        {
            if (EsLocal)
            {
                return $"LOCAL Nº {Piso}";
            }

            var pisoStr = !string.IsNullOrWhiteSpace(Piso) ? $" - Piso {Piso}" : "";
            var deptoStr = !string.IsNullOrWhiteSpace(Depto) ? $" \"{Depto}\"" : "";
            return $"UF {Id} (Sec {SectorEscalera}{pisoStr}{deptoStr})";
        }
    }

    public ICollection<OrdenTrabajo> OrdenesTrabajo { get; set; } = new List<OrdenTrabajo>();
}
