using SIPAC.API.DTOs.OrdenesTrabajo;

namespace SIPAC.API.DTOs.UnidadesFuncionales;

public class UnidadFuncionalDto
{
    public Guid Id { get; set; }
    public string SectorEscalera { get; set; } = string.Empty;
    public string? Piso { get; set; }
    public string? Depto { get; set; }
    public string DisplayNombre { get; set; } = string.Empty;
    public bool EsLocal { get; set; }
}

public class HistorialOtItemDto
{
    public Guid IdOt { get; set; }
    public string NumeroOT { get; set; } = string.Empty;
    public string CategoriaNombre { get; set; } = string.Empty;
    public string ResponsableNombre { get; set; } = string.Empty;
    public string ProblemaReportado { get; set; } = string.Empty;
    public string? SolucionRealizada { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string? Observaciones { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<OtEgresoItemDto> InsumosConsumidos { get; set; } = new();
}

public class HistorialUfResponseDto
{
    public UnidadFuncionalDto UnidadFuncional { get; set; } = null!;
    public int TotalReclamos { get; set; }
    public List<HistorialOtItemDto> Reclamos { get; set; } = new();
}
