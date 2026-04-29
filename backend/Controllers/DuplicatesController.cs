using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContactsX.Api.Data;
using ContactsX.Api.Models;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api/duplicates")]
[Authorize]
public class DuplicatesController : ControllerBase
{
    private readonly AppDbContext _db;
    private static readonly JsonSerializerOptions _camelCase = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public DuplicatesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status = null)
    {
        IQueryable<DuplicateCandidate> query = _db.DuplicateCandidates;

        if (!string.IsNullOrEmpty(status) && status != "all")
            query = query.Where(d => d.Status == status);

        var candidates = await query
            .OrderByDescending(d => d.MatchScore)
            .ToListAsync();

        var result = new List<object>();
        foreach (var c in candidates)
        {
            object? record1 = null, record2 = null;

            if (c.Status == "pending")
            {
                if (c.EntityType == "contact")
                {
                    record1 = await _db.Contacts.FindAsync(c.Record1Id);
                    record2 = await _db.Contacts.FindAsync(c.Record2Id);
                }
                else
                {
                    record1 = await _db.Entities.FindAsync(c.Record1Id);
                    record2 = await _db.Entities.FindAsync(c.Record2Id);
                }

                if (record1 == null || record2 == null) continue;
            }
            else
            {
                if (c.Record1Snapshot != null)
                    record1 = JsonSerializer.Deserialize<JsonElement>(c.Record1Snapshot);
                if (c.Record2Snapshot != null)
                    record2 = JsonSerializer.Deserialize<JsonElement>(c.Record2Snapshot);
            }

            string? resolvedByName = null;
            if (c.ResolvedBy.HasValue)
            {
                var user = await _db.Users.FindAsync(c.ResolvedBy.Value);
                resolvedByName = user?.Username;
            }

            result.Add(new
            {
                c.Id,
                c.EntityType,
                c.Record1Id,
                c.Record2Id,
                c.MatchScore,
                matchReasons = JsonSerializer.Deserialize<JsonElement>(c.MatchReasons),
                c.Status,
                c.CreatedAt,
                c.ResolvedAt,
                resolvedByName,
                record1,
                record2
            });
        }

        return Ok(result);
    }

    [HttpPost("detect")]
    public async Task<IActionResult> Detect()
    {
        var newCandidates = 0;

        var contacts = await _db.Contacts.Where(c => c.IsActive).ToListAsync();
        for (int i = 0; i < contacts.Count; i++)
        {
            for (int j = i + 1; j < contacts.Count; j++)
            {
                var (score, reasons) = CompareContacts(contacts[i], contacts[j]);
                if (score >= 50)
                {
                    var exists = await _db.DuplicateCandidates.AnyAsync(d =>
                        d.EntityType == "contact" &&
                        ((d.Record1Id == contacts[i].Id && d.Record2Id == contacts[j].Id) ||
                         (d.Record1Id == contacts[j].Id && d.Record2Id == contacts[i].Id)));

                    if (!exists)
                    {
                        _db.DuplicateCandidates.Add(new DuplicateCandidate
                        {
                            EntityType = "contact",
                            Record1Id = contacts[i].Id,
                            Record2Id = contacts[j].Id,
                            MatchScore = score,
                            MatchReasons = JsonSerializer.Serialize(reasons, _camelCase)
                        });
                        newCandidates++;
                    }
                }
            }
        }

        var entities = await _db.Entities.Where(e => e.IsActive).ToListAsync();
        for (int i = 0; i < entities.Count; i++)
        {
            for (int j = i + 1; j < entities.Count; j++)
            {
                var (score, reasons) = CompareEntities(entities[i], entities[j]);
                if (score >= 50)
                {
                    var exists = await _db.DuplicateCandidates.AnyAsync(d =>
                        d.EntityType == "entity" &&
                        ((d.Record1Id == entities[i].Id && d.Record2Id == entities[j].Id) ||
                         (d.Record1Id == entities[j].Id && d.Record2Id == entities[i].Id)));

                    if (!exists)
                    {
                        _db.DuplicateCandidates.Add(new DuplicateCandidate
                        {
                            EntityType = "entity",
                            Record1Id = entities[i].Id,
                            Record2Id = entities[j].Id,
                            MatchScore = score,
                            MatchReasons = JsonSerializer.Serialize(reasons, _camelCase)
                        });
                        newCandidates++;
                    }
                }
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { detected = newCandidates });
    }

    [HttpPost("{id}/merge")]
    public async Task<IActionResult> Merge(Guid id, [FromBody] JsonElement body)
    {
        var candidate = await _db.DuplicateCandidates.FindAsync(id);
        if (candidate == null) return NotFound(new { error = "Duplicate candidate not found" });
        if (candidate.Status != "pending") return BadRequest(new { error = "Only pending candidates can be merged" });

        if (!body.TryGetProperty("masterId", out var mid) || !Guid.TryParse(mid.GetString(), out var masterId))
            return BadRequest(new { error = "masterId is required" });

        if (masterId != candidate.Record1Id && masterId != candidate.Record2Id)
            return BadRequest(new { error = "masterId must be one of the candidate records" });

        var otherId = candidate.Record1Id == masterId ? candidate.Record2Id : candidate.Record1Id;

        if (candidate.EntityType == "contact")
        {
            var r1 = await _db.Contacts.FindAsync(candidate.Record1Id);
            var r2 = await _db.Contacts.FindAsync(candidate.Record2Id);
            candidate.Record1Snapshot = r1 != null ? JsonSerializer.Serialize(r1, _camelCase) : null;
            candidate.Record2Snapshot = r2 != null ? JsonSerializer.Serialize(r2, _camelCase) : null;

            var other = r1?.Id == otherId ? r1 : r2;
            if (other != null)
            {
                _db.AuditLogs.Add(new AuditLog
                {
                    EntityType = "contact",
                    EntityId = otherId,
                    Action = "merge",
                    Changes = JsonSerializer.Serialize(new { mergedInto = masterId, snapshot = other }, _camelCase)
                });
                _db.Contacts.Remove(other);
            }
        }
        else
        {
            var r1 = await _db.Entities.FindAsync(candidate.Record1Id);
            var r2 = await _db.Entities.FindAsync(candidate.Record2Id);
            candidate.Record1Snapshot = r1 != null ? JsonSerializer.Serialize(r1, _camelCase) : null;
            candidate.Record2Snapshot = r2 != null ? JsonSerializer.Serialize(r2, _camelCase) : null;

            var other = r1?.Id == otherId ? r1 : r2;
            if (other != null)
            {
                _db.AuditLogs.Add(new AuditLog
                {
                    EntityType = "entity",
                    EntityId = otherId,
                    Action = "merge",
                    Changes = JsonSerializer.Serialize(new { mergedInto = masterId, snapshot = other }, _camelCase)
                });
                _db.Entities.Remove(other);
            }
        }

        candidate.Status = "merged";
        candidate.ResolvedAt = DateTime.UtcNow;
        candidate.ResolvedBy = GetUserId();

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("{id}/dismiss")]
    public async Task<IActionResult> Dismiss(Guid id)
    {
        var candidate = await _db.DuplicateCandidates.FindAsync(id);
        if (candidate == null) return NotFound(new { error = "Duplicate candidate not found" });
        if (candidate.Status != "pending") return BadRequest(new { error = "Only pending candidates can be dismissed" });

        if (candidate.EntityType == "contact")
        {
            var r1 = await _db.Contacts.FindAsync(candidate.Record1Id);
            var r2 = await _db.Contacts.FindAsync(candidate.Record2Id);
            candidate.Record1Snapshot = r1 != null ? JsonSerializer.Serialize(r1, _camelCase) : null;
            candidate.Record2Snapshot = r2 != null ? JsonSerializer.Serialize(r2, _camelCase) : null;
        }
        else
        {
            var r1 = await _db.Entities.FindAsync(candidate.Record1Id);
            var r2 = await _db.Entities.FindAsync(candidate.Record2Id);
            candidate.Record1Snapshot = r1 != null ? JsonSerializer.Serialize(r1, _camelCase) : null;
            candidate.Record2Snapshot = r2 != null ? JsonSerializer.Serialize(r2, _camelCase) : null;
        }

        candidate.Status = "dismissed";
        candidate.ResolvedAt = DateTime.UtcNow;
        candidate.ResolvedBy = GetUserId();

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    private static (int score, List<string> reasons) CompareContacts(Contact a, Contact b)
    {
        int score = 0;
        var reasons = new List<string>();

        if (!string.IsNullOrWhiteSpace(a.FirstName) && !string.IsNullOrWhiteSpace(b.FirstName) &&
            a.FirstName.Equals(b.FirstName, StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(a.LastName) && !string.IsNullOrWhiteSpace(b.LastName) &&
            a.LastName.Equals(b.LastName, StringComparison.OrdinalIgnoreCase))
        {
            score += 50;
            reasons.Add("Same English name");
        }

        if (!string.IsNullOrWhiteSpace(a.NationalId) && a.NationalId == b.NationalId)
        {
            score += 50;
            reasons.Add("Same National ID");
        }

        var emailsA = GetEmailValues(a.Emails);
        var emailsB = GetEmailValues(b.Emails);
        if (emailsA.Intersect(emailsB, StringComparer.OrdinalIgnoreCase).Any())
        {
            score += 30;
            reasons.Add("Shared email address");
        }

        var phonesA = GetPhoneValues(a.Phones);
        var phonesB = GetPhoneValues(b.Phones);
        if (phonesA.Intersect(phonesB).Any())
        {
            score += 20;
            reasons.Add("Shared phone number");
        }

        return (Math.Min(score, 100), reasons);
    }

    private static (int score, List<string> reasons) CompareEntities(Entity a, Entity b)
    {
        int score = 0;
        var reasons = new List<string>();

        if (!string.IsNullOrWhiteSpace(a.NameEn) && a.NameEn.Equals(b.NameEn, StringComparison.OrdinalIgnoreCase))
        {
            score += 50;
            reasons.Add("Same English name");
        }

        if (!string.IsNullOrWhiteSpace(a.NameAr) && !string.IsNullOrWhiteSpace(b.NameAr) && a.NameAr == b.NameAr)
        {
            score += 30;
            reasons.Add("Same Arabic name");
        }

        if (!string.IsNullOrWhiteSpace(a.RegistrationId) && a.RegistrationId == b.RegistrationId)
        {
            score += 40;
            reasons.Add("Same Registration ID");
        }

        return (Math.Min(score, 100), reasons);
    }

    private static HashSet<string> GetEmailValues(string? json)
    {
        var result = new HashSet<string>();
        if (string.IsNullOrWhiteSpace(json) || json == "[]") return result;
        try
        {
            var arr = JsonSerializer.Deserialize<JsonElement>(json);
            foreach (var item in arr.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                    result.Add(item.GetString()!);
                else if (item.TryGetProperty("value", out var v))
                    result.Add(v.GetString()!);
            }
        }
        catch { }
        return result;
    }

    private static HashSet<string> GetPhoneValues(string? json)
    {
        var result = new HashSet<string>();
        if (string.IsNullOrWhiteSpace(json) || json == "[]") return result;
        try
        {
            var arr = JsonSerializer.Deserialize<JsonElement>(json);
            foreach (var item in arr.EnumerateArray())
            {
                string? val = null;
                if (item.ValueKind == JsonValueKind.String)
                    val = item.GetString();
                else if (item.TryGetProperty("value", out var v))
                    val = v.GetString();
                if (val != null)
                    result.Add(val.Replace("+", "").Replace("-", "").Replace(" ", ""));
            }
        }
        catch { }
        return result;
    }

    private Guid? GetUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }
}
