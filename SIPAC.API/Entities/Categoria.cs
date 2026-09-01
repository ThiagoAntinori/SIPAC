namespace SIPAC.API.Entities;

public class Categoria
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;

    public ICollection<Articulo> Articulos { get; set; } = new List<Articulo>();
}
