namespace SIPAC.API.DTOs.Empleados;

public class EmpleadoDto
{
    public int Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Legajo { get; set; } = string.Empty;
    public string PuestoSector { get; set; } = string.Empty;
    public bool Activo { get; set; }
}

public class CreateEmpleadoDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string Legajo { get; set; } = string.Empty;
    public string PuestoSector { get; set; } = string.Empty;
}

public class UpdateEmpleadoDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string Legajo { get; set; } = string.Empty;
    public string PuestoSector { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
}
