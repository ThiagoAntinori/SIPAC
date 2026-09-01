namespace SIPAC.API.DTOs.Egresos;

public class EgresoDto
{
    public long Id { get; set; }
    public int ArticuloId { get; set; }
    public string ArticuloNombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public long OrdenTrabajoId { get; set; }
    public string NumeroOT { get; set; } = string.Empty;
    public string UnidadFuncionalDisplay { get; set; } = string.Empty;
    public string EmpleadoNombre { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public DateTime FechaHora { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string? Observacion { get; set; }
}

public class CreateEgresoDto
{
    public int ArticuloId { get; set; }
    public long OrdenTrabajoId { get; set; }
    public decimal Cantidad { get; set; }
    public string? Observacion { get; set; }
}
