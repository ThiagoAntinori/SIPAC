namespace SIPAC.API.Entities;

public class Articulo
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int CategoriaId { get; set; }
    public Categoria? Categoria { get; set; }
    public string UnidadMedida { get; set; } = "Unidad";
    public bool EsFraccionable { get; set; } = false;
    public decimal StockActual { get; set; } = 0;
    public decimal StockMinimo { get; set; } = 0;
    public bool Activo { get; set; } = true;

    public ICollection<AjusteInventario> Ajustes { get; set; } = new List<AjusteInventario>();
    public ICollection<DetalleCompra> DetallesCompra { get; set; } = new List<DetalleCompra>();
    public ICollection<EgresoConsumo> Egresos { get; set; } = new List<EgresoConsumo>();
}
