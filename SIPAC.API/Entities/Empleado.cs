namespace SIPAC.API.Entities;

public class Empleado
{
    public int Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Legajo { get; set; } = string.Empty;
    public string PuestoSector { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
}
