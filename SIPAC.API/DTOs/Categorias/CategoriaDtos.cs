namespace SIPAC.API.DTOs.Categorias;

public class CategoriaDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int CantidadArticulos { get; set; }
}

public class CreateCategoriaDto
{
    public string Nombre { get; set; } = string.Empty;
}
