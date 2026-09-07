namespace SIPAC.API.DTOs.Empleados;

public class EmpleadoDto
{
    public Guid Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Legajo { get; set; } = string.Empty;
    public string PuestoSector { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public int CantidadOrdenes { get; set; }
    public string? Usuario { get; set; }
    public string? Email { get; set; }
    public bool TienePin { get; set; }
    public bool TienePinConfigurado => TienePin;
    public bool PendienteActivacion { get; set; }
    public bool TieneAccesoMovil => TienePin || PendienteActivacion;
    public string EstadoAccesoMovil { get; set; } = "Sin Acceso";
}

public class CreateEmpleadoDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Legajo { get; set; }
    public string? PuestoSector { get; set; }
    public string? Usuario { get; set; }
    public string? Email { get; set; }
    public bool Activo { get; set; } = true;
}

public class UpdateEmpleadoDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Legajo { get; set; }
    public string? PuestoSector { get; set; }
    public string? Usuario { get; set; }
    public string? Email { get; set; }
    public bool Activo { get; set; } = true;
}
