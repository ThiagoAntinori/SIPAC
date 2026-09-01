using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("egresos_consumo")]
public class EgresoConsumo
{
    [Column("id")]
    public long Id { get; set; }

    [Column("articulo_id")]
    public int ArticuloId { get; set; }
    public Articulo? Articulo { get; set; }

    [Column("orden_trabajo_id")]
    public Guid OrdenTrabajoId { get; set; }
    public OrdenTrabajo? OrdenTrabajo { get; set; }

    [Column("cantidad")]
    public decimal Cantidad { get; set; }

    [Column("fecha_hora")]
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;

    [Column("usuario_id")]
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    [Column("observacion")]
    public string? Observacion { get; set; }
}
