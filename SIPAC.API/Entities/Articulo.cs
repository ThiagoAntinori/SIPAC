using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("articulos")]
public class Articulo
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Column("categoria_id")]
    public int CategoriaId { get; set; }
    public Categoria? Categoria { get; set; }

    [Column("unidad_medida")]
    public string UnidadMedida { get; set; } = "Unidad";

    [Column("es_fraccionable")]
    public bool EsFraccionable { get; set; } = false;

    [Column("stock_actual")]
    public decimal StockActual { get; set; } = 0;

    [Column("stock_minimo")]
    public decimal StockMinimo { get; set; } = 0;

    [Column("activo")]
    public bool Activo { get; set; } = true;

    public ICollection<AjusteInventario> Ajustes { get; set; } = new List<AjusteInventario>();
    public ICollection<DetalleCompra> DetallesCompra { get; set; } = new List<DetalleCompra>();
    public ICollection<EgresoConsumo> Egresos { get; set; } = new List<EgresoConsumo>();
}

