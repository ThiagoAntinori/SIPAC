using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("compras")]
public class Compra
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("nro_comprobante")]
    public string NroComprobante { get; set; } = string.Empty;

    [Column("fecha_compra")]
    public DateTime FechaCompra { get; set; } = DateTime.UtcNow;

    [Column("fecha_carga")]
    public DateTime FechaCarga { get; set; } = DateTime.UtcNow;

    [Column("usuario_id")]
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    [Column("foto_comprobante_url")]
    public string? FotoComprobanteUrl { get; set; }

    [Column("observaciones_diferencia")]
    public string? ObservacionesDiferencia { get; set; }

    public ICollection<DetalleCompra> Detalles { get; set; } = new List<DetalleCompra>();
}

