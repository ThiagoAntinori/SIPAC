using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPAC.API.Entities;

[Table("ajustes_inventario")]
public class AjusteInventario
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("articulo_id")]
    public int ArticuloId { get; set; }
    public Articulo? Articulo { get; set; }

    [Column("cantidad")]
    public decimal Cantidad { get; set; }

    [Column("motivo")]
    public string Motivo { get; set; } = string.Empty;

    [Column("justificacion")]
    public string Justificacion { get; set; } = string.Empty;

    [Column("tipo_ajuste")]
    public string TipoAjuste { get; set; } = "Recuento"; // Alta, Baja, Recuento

    [Column("fecha_hora")]
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;

    [Column("usuario_id")]
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
}

