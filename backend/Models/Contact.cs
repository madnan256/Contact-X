using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ContactsX.Api.Models;

[Table("contacts")]
public class Contact
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("prefix")]
    public string? Prefix { get; set; }

    [Required]
    [Column("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [Column("middle_name")]
    public string? MiddleName { get; set; }

    [Required]
    [Column("last_name")]
    public string LastName { get; set; } = string.Empty;

    [Column("suffix")]
    public string? Suffix { get; set; }

    [Column("prefix_ar")]
    public string? PrefixAr { get; set; }

    [Column("first_name_ar")]
    public string? FirstNameAr { get; set; }

    [Column("middle_name_ar")]
    public string? MiddleNameAr { get; set; }

    [Column("last_name_ar")]
    public string? LastNameAr { get; set; }

    [Column("suffix_ar")]
    public string? SuffixAr { get; set; }

    [Column("gender")]
    public string? Gender { get; set; }

    [Column("date_of_birth")]
    public string? DateOfBirth { get; set; }

    [Column("nationality")]
    public string? Nationality { get; set; }

    [Column("national_id")]
    public string? NationalId { get; set; }

    [Required]
    [Column("contact_type")]
    public string ContactType { get; set; } = "citizen";

    [Column("current_position")]
    public string? CurrentPosition { get; set; }

    [Column("current_entity_id")]
    public Guid? CurrentEntityId { get; set; }

    [Column("current_entity_name")]
    public string? CurrentEntityName { get; set; }

    [Column("emails", TypeName = "jsonb")]
    public string Emails { get; set; } = "[]";

    [Column("phones", TypeName = "jsonb")]
    public string Phones { get; set; } = "[]";

    [Column("addresses", TypeName = "jsonb")]
    public string Addresses { get; set; } = "[]";

    [Column("classifications", TypeName = "jsonb")]
    public string Classifications { get; set; } = "[]";

    [Column("profile_completeness")]
    public int ProfileCompleteness { get; set; } = 0;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("CurrentEntityId")]
    public Entity? CurrentEntity { get; set; }
}
