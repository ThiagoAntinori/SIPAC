using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("ordenes_trabajo")]
public class OrdenTrabajo
{
    [Column("id_ot")]
    public long IdOt { get; set; }

    [Column("unidad_funcional_id")]
    public long UnidadFuncionalId { get; set; }
    public UnidadFuncional? UnidadFuncional { get; set; }

    [Column("responsable_id")]
    public long ResponsableId { get; set; }
    public Responsable? Responsable { get; set; }

    [Column("categoria_id")]
    public long CategoriaId { get; set; }
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
    public string NumeroOT => $"OT-{CreatedAt.Year}-{IdOt:D4}";

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
