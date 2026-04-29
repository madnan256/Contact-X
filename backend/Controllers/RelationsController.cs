using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContactsX.Api.Data;
using ContactsX.Api.Models;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api/relations")]
[Authorize]
public class RelationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RelationsController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JsonElement body)
    {
        if (!body.TryGetProperty("contactId", out var cid) || !Guid.TryParse(cid.GetString(), out var contactId))
            return BadRequest(new { error = "contactId is required" });

        if (!body.TryGetProperty("entityId", out var eid) || !Guid.TryParse(eid.GetString(), out var entityId))
            return BadRequest(new { error = "entityId is required" });

        if (!body.TryGetProperty("role", out var r) || string.IsNullOrWhiteSpace(r.GetString()))
            return BadRequest(new { error = "role is required" });

        var exists = await _db.ContactEntityRelations
            .AnyAsync(rel => rel.ContactId == contactId && rel.EntityId == entityId);
        if (exists)
            return Conflict(new { error = "Relationship between this contact and entity already exists" });

        var relation = new ContactEntityRelation
        {
            ContactId = contactId,
            EntityId = entityId,
            Role = r.GetString()!,
            IsPrimary = body.TryGetProperty("isPrimary", out var ip) && ip.GetBoolean(),
            IsActive = !body.TryGetProperty("isActive", out var ia) || ia.GetBoolean(),
            StartDate = body.TryGetProperty("startDate", out var sd) ? sd.GetString() : null,
            EndDate = body.TryGetProperty("endDate", out var ed) ? ed.GetString() : null
        };

        _db.ContactEntityRelations.Add(relation);
        await _db.SaveChangesAsync();
        return StatusCode(201, relation);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var relation = await _db.ContactEntityRelations.FindAsync(id);
        if (relation == null) return NotFound(new { error = "Relation not found" });

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        _db.AuditLogs.Add(new AuditLog
        {
            EntityType = "relation",
            EntityId = relation.Id,
            Action = "unlink",
            Changes = JsonSerializer.Serialize(new { contactId = relation.ContactId, entityId = relation.EntityId, role = relation.Role }),
            PerformedBy = userId != null ? Guid.Parse(userId) : null
        });

        _db.ContactEntityRelations.Remove(relation);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
