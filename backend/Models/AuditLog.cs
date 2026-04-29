using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ContactsX.Api.Models;

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("entity_type")]
    public string EntityType { get; set; } = string.Empty;

    [Required]
    [Column("entity_id")]
    public Guid EntityId { get; set; }

    [Required]
    [Column("action")]
    public string Action { get; set; } = string.Empty;

    [Column("changes", TypeName = "jsonb")]
    public string? Changes { get; set; }

    [Column("performed_by")]
    public Guid? PerformedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
