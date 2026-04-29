using Microsoft.EntityFrameworkCore;
using ContactsX.Api.Models;

namespace ContactsX.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Entity> Entities => Set<Entity>();
    public DbSet<ContactEntityRelation> ContactEntityRelations => Set<ContactEntityRelation>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<DuplicateCandidate> DuplicateCandidates => Set<DuplicateCandidate>();
    public DbSet<KpiSnapshot> KpiSnapshots => Set<KpiSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ContactEntityRelation>()
            .HasIndex(r => new { r.ContactId, r.EntityId })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<Contact>()
            .HasOne(c => c.CurrentEntity)
            .WithMany()
            .HasForeignKey(c => c.CurrentEntityId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Contact>()
            .ToTable(t => t.HasCheckConstraint("CK_contacts_contact_type",
                "contact_type IN ('citizen', 'employee', 'external', 'vip')"));

        modelBuilder.Entity<Entity>()
            .HasOne(e => e.ParentEntity)
            .WithMany()
            .HasForeignKey(e => e.ParentEntityId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ContactEntityRelation>()
            .HasOne(r => r.Contact)
            .WithMany()
            .HasForeignKey(r => r.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactEntityRelation>()
            .HasOne(r => r.Entity)
            .WithMany()
            .HasForeignKey(r => r.EntityId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
