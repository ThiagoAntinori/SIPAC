namespace SIPAC.API.DTOs.OrdenesTrabajo;

public class OtDto
{
    public long IdOt { get; set; }
    public string NumeroOT { get; set; } = string.Empty;
    public long UnidadFuncionalId { get; set; }
    public string UnidadFuncionalDisplay { get; set; } = string.Empty;
    public string SectorEscalera { get; set; } = string.Empty;
    public string? Piso { get; set; }
    public string? Depto { get; set; }
    public long ResponsableId { get; set; }
    public string ResponsableNombre { get; set; } = string.Empty;
    public long CategoriaId { get; set; }
    public string CategoriaNombre { get; set; } = string.Empty;
    public string ProblemaReportado { get; set; } = string.Empty;
    public string? SolucionRealizada { get; set; }
    public string Estado { get; set; } = "Pendiente";
    public string? Observaciones { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool EsAlertaInactividad { get; set; }
    public int DiasPendiente { get; set; }
    public List<OtEgresoItemDto> InsumosConsumidos { get; set; } = new();
    public List<OtBitacoraItemDto> Bitacora { get; set; } = new();
}

public class CreateOtDto
{
    public long UnidadFuncionalId { get; set; }
    public long ResponsableId { get; set; }
    public long CategoriaId { get; set; }
    public string ProblemaReportado { get; set; } = string.Empty;
    public string? Observaciones { get; set; }
}

public class UpdateOtDto
{
    public long ResponsableId { get; set; }
    public long CategoriaId { get; set; }
    public string ProblemaReportado { get; set; } = string.Empty;
    public string? SolucionRealizada { get; set; }
    public string Estado { get; set; } = "Pendiente";
    public string? Observaciones { get; set; }
}

public class ChangeEstadoOtDto
{
    public string Estado { get; set; } = "Pendiente";
    public string? SolucionRealizada { get; set; }
    public string? Observaciones { get; set; }
}

public class OtBitacoraItemDto
{
    public long Id { get; set; }
    public string TipoOperacion { get; set; } = string.Empty;
    public string DetalleCambio { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; }
}

public class OtEgresoItemDto
{
    public long Id { get; set; }
    public int ArticuloId { get; set; }
    public string ArticuloNombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public DateTime FechaHora { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string? Observacion { get; set; }
}
