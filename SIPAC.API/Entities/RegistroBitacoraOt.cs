using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("bitacora_logs")]
public class RegistroBitacoraOt
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("orden_trabajo_id")]
    public Guid OrdenTrabajoId { get; set; }
    public OrdenTrabajo? OrdenTrabajo { get; set; }

    [Column("tipo_operacion")]
    public string TipoOperacion { get; set; } = "CREACION"; // CREACION, CAMBIO_ESTADO, ACTUALIZACION, BAJA_LOGICA

    [Column("detalle_cambio")]
    public string DetalleCambio { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
}

