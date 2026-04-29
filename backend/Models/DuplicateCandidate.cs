using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ContactsX.Api.Models;

[Table("duplicate_candidates")]
public class DuplicateCandidate
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("entity_type")]
    public string EntityType { get; set; } = string.Empty;

    [Required]
    [Column("record1_id")]
    public Guid Record1Id { get; set; }

    [Required]
    [Column("record2_id")]
    public Guid Record2Id { get; set; }

    [Required]
    [Column("match_score")]
    public int MatchScore { get; set; }

    [Column("match_reasons", TypeName = "jsonb")]
    public string MatchReasons { get; set; } = "[]";

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }

    [Column("resolved_by")]
    public Guid? ResolvedBy { get; set; }

    [Column("record1_snapshot", TypeName = "jsonb")]
    public string? Record1Snapshot { get; set; }

    [Column("record2_snapshot", TypeName = "jsonb")]
    public string? Record2Snapshot { get; set; }
}
