namespace SIPAC.API.DTOs.CategoriasTrabajo;

public class CategoriaTrabajoDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public int CantidadOrdenes { get; set; }
}

public class CreateCategoriaTrabajoDto
{
    public string Nombre { get; set; } = string.Empty;
}

public class UpdateCategoriaTrabajoDto
{
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
}
