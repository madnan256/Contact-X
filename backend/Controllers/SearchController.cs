using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContactsX.Api.Data;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api/search")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _db;

    public SearchController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return Ok(new { contacts = Array.Empty<object>(), entities = Array.Empty<object>() });

        var q = query.Trim();
        var pattern = $"%{q}%";

        var contacts = await _db.Contacts
            .Where(c =>
                (c.FirstName != null && EF.Functions.ILike(c.FirstName, pattern)) ||
                (c.LastName != null && EF.Functions.ILike(c.LastName, pattern)) ||
                (c.MiddleName != null && EF.Functions.ILike(c.MiddleName, pattern)) ||
                (c.Prefix != null && EF.Functions.ILike(c.Prefix, pattern)) ||
                (c.Suffix != null && EF.Functions.ILike(c.Suffix, pattern)) ||
                (c.FirstNameAr != null && EF.Functions.ILike(c.FirstNameAr, pattern)) ||
                (c.LastNameAr != null && EF.Functions.ILike(c.LastNameAr, pattern)) ||
                (c.MiddleNameAr != null && EF.Functions.ILike(c.MiddleNameAr, pattern)) ||
                (c.PrefixAr != null && EF.Functions.ILike(c.PrefixAr, pattern)) ||
                (c.SuffixAr != null && EF.Functions.ILike(c.SuffixAr, pattern)) ||
                (c.NationalId != null && EF.Functions.ILike(c.NationalId, pattern)))
            .Take(20)
            .ToListAsync();

        var entities = await _db.Entities
            .Where(e =>
                (e.NameEn != null && EF.Functions.ILike(e.NameEn, pattern)) ||
                (e.NameAr != null && EF.Functions.ILike(e.NameAr, pattern)) ||
                (e.RegistrationId != null && EF.Functions.ILike(e.RegistrationId, pattern)))
            .Take(20)
            .ToListAsync();

        var entityIds = entities.Select(e => e.Id).ToHashSet();

        var contactPointMatches = await _db.Entities
            .FromSqlRaw(
                @"SELECT * FROM entities WHERE
                  contact_points::text ILIKE '%' || {0} || '%'
                  LIMIT 20", q)
            .ToListAsync();

        foreach (var cpm in contactPointMatches)
        {
            if (!entityIds.Contains(cpm.Id))
            {
                entities.Add(cpm);
                entityIds.Add(cpm.Id);
            }
        }

        var childMatches = await _db.Entities
            .Where(e => e.ParentEntityId != null &&
                ((e.NameEn != null && EF.Functions.ILike(e.NameEn, pattern)) ||
                 (e.NameAr != null && EF.Functions.ILike(e.NameAr, pattern))))
            .Take(20)
            .ToListAsync();

        foreach (var child in childMatches)
        {
            if (!entityIds.Contains(child.Id))
            {
                entities.Add(child);
                entityIds.Add(child.Id);
            }

            if (child.ParentEntityId.HasValue && !entityIds.Contains(child.ParentEntityId.Value))
            {
                var parent = await _db.Entities.FindAsync(child.ParentEntityId.Value);
                if (parent != null)
                {
                    entities.Add(parent);
                    entityIds.Add(parent.Id);
                }
            }
        }

        if (entities.Count > 20)
            entities = entities.Take(20).ToList();

        return Ok(new { contacts, entities });
    }
}
