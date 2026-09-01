namespace SIPAC.API.DTOs.Responsables;

public class ResponsableDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public int CantidadOrdenes { get; set; }
}

public class CreateResponsableDto
{
    public string Nombre { get; set; } = string.Empty;
}

public class UpdateResponsableDto
{
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
}
