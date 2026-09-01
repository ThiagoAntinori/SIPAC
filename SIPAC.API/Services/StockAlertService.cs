using Microsoft.EntityFrameworkCore;
using SIPAC.API.Data;
using SIPAC.API.Entities;

namespace SIPAC.API.Services;

public class StockAlertService
{
    private readonly SipacDbContext _context;

    public StockAlertService(SipacDbContext context)
    {
        _context = context;
    }

    public async Task<List<Articulo>> GetArticulosStockCriticoAsync()
    {
        return await _context.Articulos
            .Include(a => a.Categoria)
            .Where(a => a.Activo && a.StockActual <= a.StockMinimo)
            .OrderBy(a => a.StockActual)
            .ToListAsync();
    }
}
