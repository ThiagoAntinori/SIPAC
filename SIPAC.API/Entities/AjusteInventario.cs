namespace SIPAC.API.Entities;

public class AjusteInventario
{
    public int Id { get; set; }
    public int ArticuloId { get; set; }
    public Articulo? Articulo { get; set; }
    public decimal Cantidad { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string Justificacion { get; set; } = string.Empty;
    public string TipoAjuste { get; set; } = "Recuento"; // Alta, Baja, Recuento
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
}
