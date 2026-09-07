using System.ComponentModel.DataAnnotations;

namespace SIPAC.API.DTOs.Operarios;

public class HabilitarAccesoRequest
{
    [Required(ErrorMessage = "El correo electrónico es requerido.")]
    [EmailAddress(ErrorMessage = "Formato de correo electrónico inválido.")]
    public string Email { get; set; } = string.Empty;
}

public class HabilitarAccesoResponse
{
    public Guid Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Usuario { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string ActivationUrl { get; set; } = string.Empty;
    public bool EmailEnviado { get; set; }
}

public class ValidarTokenPinResponse
{
    public bool Valido { get; set; }
    public string NombreOperario { get; set; } = string.Empty;
    public string Usuario { get; set; } = string.Empty;
    public string? Mensaje { get; set; }
}

public class ActivarPinRequest
{
    [Required(ErrorMessage = "El token de activación es requerido.")]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "El PIN es requerido.")]
    [RegularExpression(@"^\d{4}$", ErrorMessage = "El PIN debe constar exactamente de 4 dígitos numéricos.")]
    public string Pin { get; set; } = string.Empty;
}

public class LoginOperarioRequest
{
    [Required(ErrorMessage = "El nombre de usuario es requerido.")]
    public string Usuario { get; set; } = string.Empty;

    [Required(ErrorMessage = "El PIN es requerido.")]
    [RegularExpression(@"^\d{4}$", ErrorMessage = "El PIN debe constar exactamente de 4 dígitos numéricos.")]
    public string Pin { get; set; } = string.Empty;
}

public class LoginOperarioResponse
{
    public string Token { get; set; } = string.Empty;
    public OperarioPerfilDto Operario { get; set; } = null!;
}

public class OperarioPerfilDto
{
    public Guid Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Usuario { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Legajo { get; set; }
    public string? PuestoSector { get; set; }
    public string Rol { get; set; } = "Operario";
}

public class MisTareasDto
{
    public Guid IdOt { get; set; }
    public string NumeroOT { get; set; } = string.Empty;
    public Guid UnidadFuncionalId { get; set; }
    public string UnidadFuncionalDisplay { get; set; } = string.Empty;
    public string SectorEscalera { get; set; } = string.Empty;
    public string? Piso { get; set; }
    public string? Depto { get; set; }
    public Guid CategoriaId { get; set; }
    public string CategoriaNombre { get; set; } = string.Empty;
    public string ProblemaReportado { get; set; } = string.Empty;
    public string? SolucionRealizada { get; set; }
    public string? MotivoSuspension { get; set; }
    public string Estado { get; set; } = string.Empty;
    public bool LeidaPorOperario { get; set; }
    public string? Observaciones { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int DiasPendiente { get; set; }
}

public class ElevarFinalizacionRequest
{
    [Required(ErrorMessage = "Para elevar la finalización debe describir la solución realizada.")]
    public string SolucionRealizada { get; set; } = string.Empty;
}

public class ElevarSuspensionRequest
{
    [Required(ErrorMessage = "Debe ingresar el motivo de suspensión o impedimento.")]
    public string MotivoSuspension { get; set; } = string.Empty;
}

public class RechazarAprobacionRequest
{
    [Required(ErrorMessage = "Debe ingresar la observación o motivo de reapertura.")]
    public string Observaciones { get; set; } = string.Empty;
}

public class HistorialOperarioResponseDto
{
    public List<MisTareasDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / Math.Max(PageSize, 1));
}

public class SuscripcionPushRequest
{
    [Required]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    public string P256dh { get; set; } = string.Empty;

    [Required]
    public string Auth { get; set; } = string.Empty;
}
