using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("ordenes_trabajo")]
public class OrdenTrabajo
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [NotMapped]
    public Guid IdOt => Id;

    [Column("unidad_funcional_id")]
    public Guid UnidadFuncionalId { get; set; }
    public UnidadFuncional? UnidadFuncional { get; set; }

    [Column("responsable_id")]
    public Guid ResponsableId { get; set; }
    public Empleado? Responsable { get; set; }

    [Column("categoria_id")]
    public Guid CategoriaId { get; set; }
    public CategoriaTrabajo? Categoria { get; set; }

    [Column("problema_reportado")]
    public string ProblemaReportado { get; set; } = string.Empty;

    [Column("solucion_realizada")]
    public string? SolucionRealizada { get; set; }

    [Column("estado")]
    public string Estado { get; set; } = "Pendiente"; // Pendiente, En Proceso, Finalizado, Suspendido, Cancelado

    [Column("observaciones")]
    public string? Observaciones { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [NotMapped]
    public string NumeroOT => $"OT-{CreatedAt.Year}-{Id.ToString()[..8].ToUpper()}";

    [NotMapped]
    public bool EsAlertaInactividad =>
        string.Equals(Estado, "Pendiente", StringComparison.OrdinalIgnoreCase) &&
        (DateTime.UtcNow - CreatedAt).TotalDays >= 5;

    [NotMapped]
    public int DiasPendiente =>
        string.Equals(Estado, "Pendiente", StringComparison.OrdinalIgnoreCase)
            ? (int)(DateTime.UtcNow - CreatedAt).TotalDays
            : 0;

    public ICollection<RegistroBitacoraOt> Bitacora { get; set; } = new List<RegistroBitacoraOt>();
    public ICollection<EgresoConsumo> Egresos { get; set; } = new List<EgresoConsumo>();
}
