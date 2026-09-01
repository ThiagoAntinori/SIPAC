namespace SIPAC.API.Entities;

public class DetalleCompra
{
    public int Id { get; set; }
    public int CompraId { get; set; }
    public Compra? Compra { get; set; }
    public int ArticuloId { get; set; }
    public Articulo? Articulo { get; set; }
    public decimal CantidadRecibida { get; set; }
}
