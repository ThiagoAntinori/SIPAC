namespace SIPAC.API.DTOs.Compras;

public class DetalleCompraDto
{
    public int Id { get; set; }
    public int ArticuloId { get; set; }
    public string ArticuloNombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal CantidadRecibida { get; set; }
}

public class CreateDetalleCompraDto
{
    public int ArticuloId { get; set; }
    public decimal CantidadRecibida { get; set; }
}

public class CompraDto
{
    public int Id { get; set; }
    public string NroComprobante { get; set; } = string.Empty;
    public DateTime FechaCompra { get; set; }
    public DateTime FechaCarga { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string? FotoComprobanteUrl { get; set; }
    public string? ObservacionesDiferencia { get; set; }
    public List<DetalleCompraDto> Detalles { get; set; } = new();
}

public class CreateCompraDto
{
    public string NroComprobante { get; set; } = string.Empty;
    public DateTime FechaCompra { get; set; } = DateTime.UtcNow;
    public string? FotoComprobanteUrl { get; set; }
    public string? ObservacionesDiferencia { get; set; }
    public List<CreateDetalleCompraDto> Detalles { get; set; } = new();
}
