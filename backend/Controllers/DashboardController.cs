using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContactsX.Api.Data;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalContacts = await _db.Contacts.CountAsync();
        var totalEntities = await _db.Entities.CountAsync();
        var activeContacts = await _db.Contacts.CountAsync(c => c.IsActive);
        var activeEntities = await _db.Entities.CountAsync(e => e.IsActive);
        var avgCompleteness = totalContacts > 0
            ? (int)await _db.Contacts.AverageAsync(c => c.ProfileCompleteness)
            : 0;
        var duplicateCandidates = await _db.DuplicateCandidates.CountAsync(d => d.Status == "pending");
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var recentActivity = await _db.AuditLogs.CountAsync(a => a.CreatedAt >= thirtyDaysAgo);

        var contactsByType = await _db.Contacts
            .GroupBy(c => c.ContactType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToListAsync();

        var entitiesByType = await _db.Entities
            .GroupBy(e => e.EntityType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            totalContacts,
            totalEntities,
            activeContacts,
            activeEntities,
            averageCompleteness = avgCompleteness,
            duplicateCandidates,
            recentActivity,
            contactsByType,
            entitiesByType
        });
    }

    [HttpGet("dashboards/executive")]
    public async Task<IActionResult> Executive()
    {
        var totalContacts = await _db.Contacts.CountAsync();
        var totalEntities = await _db.Entities.CountAsync();

        var contactCompleteness = totalContacts > 0
            ? (int)await _db.Contacts.AverageAsync(c => c.ProfileCompleteness)
            : 0;
        var entityCompleteness = totalEntities > 0
            ? (int)await _db.Entities.AverageAsync(e => e.ProfileCompleteness)
            : 0;

        var totalDuplicates = await _db.DuplicateCandidates.CountAsync();
        var pendingDuplicates = await _db.DuplicateCandidates.CountAsync(d => d.Status == "pending");
        var duplicateRiskIndex = totalDuplicates > 0
            ? (int)Math.Round((double)pendingDuplicates / totalDuplicates * 100)
            : 0;

        var topEngagedEntities = await _db.ContactEntityRelations
            .GroupBy(r => r.EntityId)
            .Select(g => new { entityId = g.Key, count = g.Count() })
            .OrderByDescending(g => g.count)
            .Take(10)
            .ToListAsync();

        var topEntitiesWithNames = new List<object>();
        foreach (var te in topEngagedEntities)
        {
            var entity = await _db.Entities.FindAsync(te.entityId);
            if (entity != null)
                topEntitiesWithNames.Add(new { entity.Id, entity.NameEn, entity.NameAr, contactCount = te.count });
        }

        var contactsByType = await _db.Contacts
            .GroupBy(c => c.ContactType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToListAsync();

        var entitiesByType = await _db.Entities
            .GroupBy(e => e.EntityType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToListAsync();

        var completenessDistribution = await _db.Contacts
            .GroupBy(c => c.ProfileCompleteness <= 20 ? "0-20"
                : c.ProfileCompleteness <= 40 ? "21-40"
                : c.ProfileCompleteness <= 60 ? "41-60"
                : c.ProfileCompleteness <= 80 ? "61-80"
                : "81-100")
            .Select(g => new { range = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            totalContacts,
            totalEntities,
            contactCompleteness,
            entityCompleteness,
            duplicateRiskIndex,
            topEngagedEntities = topEntitiesWithNames,
            contactsByType,
            entitiesByType,
            completenessDistribution
        });
    }

    [HttpGet("dashboards/governance")]
    public async Task<IActionResult> Governance()
    {
        var weakContacts = await _db.Contacts.CountAsync(c => c.ProfileCompleteness < 50);
        var weakEntities = await _db.Entities.CountAsync(e => e.ProfileCompleteness < 50);

        var totalDuplicates = await _db.DuplicateCandidates.CountAsync();
        var pendingDuplicates = await _db.DuplicateCandidates.CountAsync(d => d.Status == "pending");
        var resolvedDuplicates = await _db.DuplicateCandidates.CountAsync(d => d.Status != "pending");
        var highConfidence = await _db.DuplicateCandidates.CountAsync(d => d.Status == "pending" && d.MatchScore >= 80);
        var mediumConfidence = await _db.DuplicateCandidates.CountAsync(d => d.Status == "pending" && d.MatchScore >= 50 && d.MatchScore < 80);
        var lowConfidence = await _db.DuplicateCandidates.CountAsync(d => d.Status == "pending" && d.MatchScore < 50);
        var resolutionRate = totalDuplicates > 0
            ? (int)Math.Round((double)resolvedDuplicates / totalDuplicates * 100)
            : 0;

        var contactIdsWithRelations = await _db.ContactEntityRelations.Select(r => r.ContactId).Distinct().ToListAsync();
        var orphanContacts = await _db.Contacts.CountAsync(c => !contactIdsWithRelations.Contains(c.Id));

        var entityIdsWithRelations = await _db.ContactEntityRelations.Select(r => r.EntityId).Distinct().ToListAsync();
        var orphanEntities = await _db.Entities.CountAsync(e => !entityIdsWithRelations.Contains(e.Id));

        var contactsMissingNationality = await _db.Contacts.CountAsync(c => string.IsNullOrEmpty(c.Nationality));
        var contactsMissingPosition = await _db.Contacts.CountAsync(c => string.IsNullOrEmpty(c.CurrentPosition));
        var entitiesMissingCountry = await _db.Entities.CountAsync(e => string.IsNullOrEmpty(e.Country));
        var entitiesMissingSector = await _db.Entities.CountAsync(e => string.IsNullOrEmpty(e.Sector));

        var vipIncomplete = await _db.Contacts.CountAsync(c => c.ContactType == "vip" && c.ProfileCompleteness < 100);

        return Ok(new
        {
            weakProfiles = new { contacts = weakContacts, entities = weakEntities },
            duplicateMetrics = new
            {
                total = totalDuplicates,
                pending = pendingDuplicates,
                resolved = resolvedDuplicates,
                highConfidence,
                mediumConfidence,
                lowConfidence,
                resolutionRate
            },
            orphanRecords = new { contacts = orphanContacts, entities = orphanEntities },
            mandatoryFieldViolations = new
            {
                contactsMissingNationality,
                contactsMissingPosition,
                entitiesMissingCountry,
                entitiesMissingSector
            },
            vipIncomplete
        });
    }

    [HttpGet("dashboards/operational")]
    public async Task<IActionResult> Operational()
    {
        var now = DateTime.UtcNow;
        var days30 = now.AddDays(-30);
        var days90 = now.AddDays(-90);
        var days365 = now.AddDays(-365);

        var activeContacts30 = await _db.Contacts.CountAsync(c => c.UpdatedAt >= days30);
        var activeContacts90 = await _db.Contacts.CountAsync(c => c.UpdatedAt >= days90);
        var activeContacts365 = await _db.Contacts.CountAsync(c => c.UpdatedAt >= days365);
        var activeEntities30 = await _db.Entities.CountAsync(e => e.UpdatedAt >= days30);
        var activeEntities90 = await _db.Entities.CountAsync(e => e.UpdatedAt >= days90);

        var recentContacts = await _db.Contacts.CountAsync(c => c.CreatedAt >= days30);
        var recentEntities = await _db.Entities.CountAsync(e => e.CreatedAt >= days30);

        var multiEntityContacts = await _db.ContactEntityRelations
            .GroupBy(r => r.ContactId)
            .Where(g => g.Count() > 1)
            .CountAsync();

        var totalContactsWithRelations = await _db.ContactEntityRelations
            .Select(r => r.ContactId).Distinct().CountAsync();
        var totalRelations = await _db.ContactEntityRelations.CountAsync();
        var avgEntitiesPerContact = totalContactsWithRelations > 0
            ? Math.Round((double)totalRelations / totalContactsWithRelations, 1)
            : 0;

        var mostActiveContacts = await _db.ContactEntityRelations
            .GroupBy(r => r.ContactId)
            .Select(g => new { contactId = g.Key, relationCount = g.Count() })
            .OrderByDescending(g => g.relationCount)
            .Take(10)
            .ToListAsync();

        var mostActiveWithNames = new List<object>();
        foreach (var mc in mostActiveContacts)
        {
            var contact = await _db.Contacts.FindAsync(mc.contactId);
            if (contact != null)
                mostActiveWithNames.Add(new { contact.Id, contact.FirstName, contact.LastName, mc.relationCount });
        }

        var inactiveContacts = await _db.Contacts.CountAsync(c => c.UpdatedAt < days90);

        return Ok(new
        {
            activeContacts = new { days30 = activeContacts30, days90 = activeContacts90, days365 = activeContacts365 },
            activeEntities = new { days30 = activeEntities30, days90 = activeEntities90 },
            recentlyCreated = new { contacts = recentContacts, entities = recentEntities },
            multiEntityContacts,
            avgEntitiesPerContact,
            mostActiveContacts = mostActiveWithNames,
            recentlyInactiveContacts = inactiveContacts
        });
    }

    [HttpGet("dashboards/analytics")]
    public async Task<IActionResult> Analytics()
    {
        var contactsByType = await _db.Contacts
            .GroupBy(c => c.ContactType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToListAsync();

        var entitiesByType = await _db.Entities
            .GroupBy(e => e.EntityType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToListAsync();

        var completenessDistribution = await _db.Contacts
            .GroupBy(c => c.ProfileCompleteness <= 20 ? "0-20"
                : c.ProfileCompleteness <= 40 ? "21-40"
                : c.ProfileCompleteness <= 60 ? "41-60"
                : c.ProfileCompleteness <= 80 ? "61-80"
                : "81-100")
            .Select(g => new { range = g.Key, count = g.Count() })
            .ToListAsync();

        var now = DateTime.UtcNow;
        var activityTrends = new List<object>();
        for (int i = 5; i >= 0; i--)
        {
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1);
            var label = monthStart.ToString("MMM yyyy");
            var contactsCreated = await _db.Contacts.CountAsync(c => c.CreatedAt >= monthStart && c.CreatedAt < monthEnd);
            var entitiesCreated = await _db.Entities.CountAsync(e => e.CreatedAt >= monthStart && e.CreatedAt < monthEnd);
            var auditActions = await _db.AuditLogs.CountAsync(a => a.CreatedAt >= monthStart && a.CreatedAt < monthEnd);
            activityTrends.Add(new { month = label, contacts = contactsCreated, entities = entitiesCreated, actions = auditActions });
        }

        return Ok(new
        {
            contactsByType,
            entitiesByType,
            completenessDistribution,
            activityTrends
        });
    }

    [HttpGet("kpis/duplicates")]
    public async Task<IActionResult> DuplicateKpis()
    {
        var total = await _db.DuplicateCandidates.CountAsync();
        var pending = await _db.DuplicateCandidates.CountAsync(d => d.Status == "pending");
        var merged = await _db.DuplicateCandidates.CountAsync(d => d.Status == "merged");
        var dismissed = await _db.DuplicateCandidates.CountAsync(d => d.Status == "dismissed");
        var highConfidence = await _db.DuplicateCandidates.CountAsync(d => d.MatchScore >= 80);
        var mediumConfidence = await _db.DuplicateCandidates.CountAsync(d => d.MatchScore >= 50 && d.MatchScore < 80);
        var lowConfidence = await _db.DuplicateCandidates.CountAsync(d => d.MatchScore < 50);
        var resolutionRate = total > 0 ? (int)Math.Round((double)(merged + dismissed) / total * 100) : 0;

        return Ok(new { total, pending, merged, dismissed, highConfidence, mediumConfidence, lowConfidence, resolutionRate });
    }

    [HttpGet("kpis/weak-contacts")]
    public async Task<IActionResult> WeakContacts([FromQuery] int limit = 50)
    {
        var contacts = await _db.Contacts
            .Where(c => c.ProfileCompleteness < 50)
            .OrderBy(c => c.ProfileCompleteness)
            .Take(limit)
            .ToListAsync();
        return Ok(contacts);
    }

    [HttpGet("kpis/weak-entities")]
    public async Task<IActionResult> WeakEntities([FromQuery] int limit = 50)
    {
        var entities = await _db.Entities
            .Where(e => e.ProfileCompleteness < 50)
            .OrderBy(e => e.ProfileCompleteness)
            .Take(limit)
            .ToListAsync();
        return Ok(entities);
    }

    [HttpGet("kpis/orphan-contacts")]
    public async Task<IActionResult> OrphanContacts()
    {
        var contactIdsWithRelations = await _db.ContactEntityRelations.Select(r => r.ContactId).Distinct().ToListAsync();
        var orphans = await _db.Contacts.Where(c => !contactIdsWithRelations.Contains(c.Id)).ToListAsync();
        return Ok(orphans);
    }

    [HttpGet("kpis/orphan-entities")]
    public async Task<IActionResult> OrphanEntities()
    {
        var entityIdsWithRelations = await _db.ContactEntityRelations.Select(r => r.EntityId).Distinct().ToListAsync();
        var orphans = await _db.Entities.Where(e => !entityIdsWithRelations.Contains(e.Id)).ToListAsync();
        return Ok(orphans);
    }

    [HttpGet("kpis/vip-incomplete")]
    public async Task<IActionResult> VipIncomplete()
    {
        var vips = await _db.Contacts
            .Where(c => c.ContactType == "vip" && c.ProfileCompleteness < 100)
            .OrderBy(c => c.ProfileCompleteness)
            .ToListAsync();
        return Ok(vips);
    }
}
