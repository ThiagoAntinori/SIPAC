namespace SIPAC.API.Entities;

public class Compra
{
    public int Id { get; set; }
    public string NroComprobante { get; set; } = string.Empty;
    public DateTime FechaCompra { get; set; } = DateTime.UtcNow;
    public DateTime FechaCarga { get; set; } = DateTime.UtcNow;
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
    public string? FotoComprobanteUrl { get; set; }
    public string? ObservacionesDiferencia { get; set; }

    public ICollection<DetalleCompra> Detalles { get; set; } = new List<DetalleCompra>();
}
