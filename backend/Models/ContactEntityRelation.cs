using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ContactsX.Api.Models;

[Table("contact_entity_relations")]
public class ContactEntityRelation
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("contact_id")]
    public Guid ContactId { get; set; }

    [Required]
    [Column("entity_id")]
    public Guid EntityId { get; set; }

    [Required]
    [Column("role")]
    public string Role { get; set; } = string.Empty;

    [Column("is_primary")]
    public bool IsPrimary { get; set; } = false;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("start_date")]
    public string? StartDate { get; set; }

    [Column("end_date")]
    public string? EndDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("ContactId")]
    public Contact? Contact { get; set; }

    [ForeignKey("EntityId")]
    public Entity? Entity { get; set; }
}
