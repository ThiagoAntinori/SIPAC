namespace SIPAC.API.DTOs.Articulos;

public class ArticuloDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int CategoriaId { get; set; }
    public string CategoriaNombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public bool EsFraccionable { get; set; }
    public decimal StockActual { get; set; }
    public decimal StockMinimo { get; set; }
    public bool Activo { get; set; }
    public bool StockBajo => StockActual <= StockMinimo;
}

public class CreateArticuloDto
{
    public string Nombre { get; set; } = string.Empty;
    public int CategoriaId { get; set; }
    public string UnidadMedida { get; set; } = "Unidad";
    public bool EsFraccionable { get; set; }
    public decimal StockActual { get; set; }
    public decimal StockMinimo { get; set; }
}

public class UpdateArticuloDto
{
    public string Nombre { get; set; } = string.Empty;
    public int CategoriaId { get; set; }
    public string UnidadMedida { get; set; } = "Unidad";
    public bool EsFraccionable { get; set; }
    public decimal StockMinimo { get; set; }
    public bool Activo { get; set; } = true;
}
