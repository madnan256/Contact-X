using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ContactsX.Api.Models;

[Table("entities")]
public class Entity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("name_en")]
    public string NameEn { get; set; } = string.Empty;

    [Column("name_ar")]
    public string? NameAr { get; set; }

    [Required]
    [Column("entity_type")]
    public string EntityType { get; set; } = string.Empty;

    [Column("country")]
    public string? Country { get; set; }

    [Column("sector")]
    public string? Sector { get; set; }

    [Column("registration_id")]
    public string? RegistrationId { get; set; }

    [Column("parent_entity_id")]
    public Guid? ParentEntityId { get; set; }

    [Column("addresses", TypeName = "jsonb")]
    public string Addresses { get; set; } = "[]";

    [Column("contact_points", TypeName = "jsonb")]
    public string ContactPoints { get; set; } = "[]";

    [Column("profile_completeness")]
    public int ProfileCompleteness { get; set; } = 0;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("ParentEntityId")]
    public Entity? ParentEntity { get; set; }
}
