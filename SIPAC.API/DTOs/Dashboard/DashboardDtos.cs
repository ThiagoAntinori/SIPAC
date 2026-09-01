using SIPAC.API.DTOs.Articulos;
using SIPAC.API.DTOs.Egresos;
using SIPAC.API.DTOs.OrdenesTrabajo;

namespace SIPAC.API.DTOs.Dashboard;

public class DashboardSummaryDto
{
    public int TotalArticulos { get; set; }
    public int ArticulosStockBajo { get; set; }
    public int TotalOrdenesActivas { get; set; }
    public int TotalAlertasInactividad { get; set; }
    public int EgresosHoy { get; set; }
    public List<ArticuloDto> StockCritico { get; set; } = new();
    public List<EgresoDto> EgresosRecientes { get; set; } = new();
    public List<OtDto> UltimasOrdenes { get; set; } = new();
}
