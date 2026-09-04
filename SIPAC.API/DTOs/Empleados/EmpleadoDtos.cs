namespace SIPAC.API.DTOs.Empleados;

public class EmpleadoDto
{
    public Guid Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Legajo { get; set; } = string.Empty;
    public string PuestoSector { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public int CantidadOrdenes { get; set; }
}

public class CreateEmpleadoDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Legajo { get; set; }
    public string? PuestoSector { get; set; }
}

public class UpdateEmpleadoDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Legajo { get; set; }
    public string? PuestoSector { get; set; }
    public bool Activo { get; set; } = true;
}
