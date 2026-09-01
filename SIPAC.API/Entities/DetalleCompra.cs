using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("detalle_compras")]
public class DetalleCompra
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("compra_id")]
    public int CompraId { get; set; }
    public Compra? Compra { get; set; }

    [Column("articulo_id")]
    public int ArticuloId { get; set; }
    public Articulo? Articulo { get; set; }

    [Column("cantidad_recibida")]
    public decimal CantidadRecibida { get; set; }
}

