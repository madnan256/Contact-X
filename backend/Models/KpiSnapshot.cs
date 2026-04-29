using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ContactsX.Api.Models;

[Table("kpi_snapshots")]
public class KpiSnapshot
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("kpi_name")]
    public string KpiName { get; set; } = string.Empty;

    [Required]
    [Column("kpi_value")]
    public decimal KpiValue { get; set; }

    [Column("kpi_details", TypeName = "jsonb")]
    public string? KpiDetails { get; set; }

    [Column("snapshot_date")]
    public DateTime SnapshotDate { get; set; } = DateTime.UtcNow;
}
