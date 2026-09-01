namespace SIPAC.API.DTOs.Ajustes;

public class AjusteDto
{
    public int Id { get; set; }
    public int ArticuloId { get; set; }
    public string ArticuloNombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string Justificacion { get; set; } = string.Empty;
    public string TipoAjuste { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
}

public class CreateAjusteDto
{
    public int ArticuloId { get; set; }
    public decimal Cantidad { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string Justificacion { get; set; } = string.Empty;
    public string TipoAjuste { get; set; } = "Recuento"; // Alta, Baja, Recuento
}
