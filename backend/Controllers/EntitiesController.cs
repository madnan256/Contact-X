using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContactsX.Api.Data;
using ContactsX.Api.Models;
using ContactsX.Api.Services;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api/entities")]
[Authorize]
public class EntitiesController : ControllerBase
{
    private readonly AppDbContext _db;

    public EntitiesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var entities = await _db.Entities.OrderByDescending(e => e.CreatedAt).ToListAsync();
        return Ok(entities);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var entity = await _db.Entities.FindAsync(id);
        if (entity == null) return NotFound(new { error = "Entity not found" });
        return Ok(entity);
    }

    [HttpGet("{id}/children")]
    public async Task<IActionResult> GetChildren(Guid id)
    {
        var children = await _db.Entities.Where(e => e.ParentEntityId == id).ToListAsync();
        return Ok(children);
    }

    [HttpGet("{id}/contacts")]
    public async Task<IActionResult> GetContacts(Guid id)
    {
        var relations = await _db.ContactEntityRelations
            .Where(r => r.EntityId == id)
            .Include(r => r.Contact)
            .ToListAsync();
        return Ok(relations);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JsonElement body)
    {
        var entity = MapEntity(body, new Entity());
        var errors = ValidationService.ValidateEntity(entity.NameEn, entity.NameAr, entity.EntityType, entity.ParentEntityId, null, entity.ContactPoints);

        if (errors.Count > 0)
            return BadRequest(new { error = string.Join("; ", errors) });

        entity.ProfileCompleteness = ValidationService.CalculateEntityCompleteness(entity);
        _db.Entities.Add(entity);

        _db.AuditLogs.Add(new AuditLog
        {
            EntityType = "entity",
            EntityId = entity.Id,
            Action = "create",
            Changes = JsonSerializer.Serialize(entity),
            PerformedBy = GetUserId()
        });

        await _db.SaveChangesAsync();
        return StatusCode(201, entity);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] JsonElement body)
    {
        var entity = await _db.Entities.FindAsync(id);
        if (entity == null) return NotFound(new { error = "Entity not found" });

        var oldData = JsonSerializer.Serialize(entity);
        MapEntity(body, entity);
        entity.UpdatedAt = DateTime.UtcNow;

        var errors = ValidationService.ValidateEntity(entity.NameEn, entity.NameAr, entity.EntityType, entity.ParentEntityId, id, entity.ContactPoints);
        if (errors.Count > 0)
            return BadRequest(new { error = string.Join("; ", errors) });

        entity.ProfileCompleteness = ValidationService.CalculateEntityCompleteness(entity);

        _db.AuditLogs.Add(new AuditLog
        {
            EntityType = "entity",
            EntityId = entity.Id,
            Action = "update",
            Changes = JsonSerializer.Serialize(new { before = oldData, after = JsonSerializer.Serialize(entity) }),
            PerformedBy = GetUserId()
        });

        await _db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entity = await _db.Entities.FindAsync(id);
        if (entity == null) return NotFound(new { error = "Entity not found" });

        _db.AuditLogs.Add(new AuditLog
        {
            EntityType = "entity",
            EntityId = entity.Id,
            Action = "delete",
            Changes = JsonSerializer.Serialize(entity),
            PerformedBy = GetUserId()
        });

        _db.Entities.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private Entity MapEntity(JsonElement body, Entity entity)
    {
        if (body.TryGetProperty("nameEn", out var ne)) entity.NameEn = ne.GetString() ?? "";
        if (body.TryGetProperty("nameAr", out var na)) entity.NameAr = na.GetString();
        if (body.TryGetProperty("entityType", out var et)) entity.EntityType = et.GetString() ?? "";
        if (body.TryGetProperty("country", out var co)) entity.Country = co.GetString();
        if (body.TryGetProperty("sector", out var se)) entity.Sector = se.GetString();
        if (body.TryGetProperty("registrationId", out var ri)) entity.RegistrationId = ri.GetString();
        if (body.TryGetProperty("isActive", out var ia)) entity.IsActive = ia.GetBoolean();

        if (body.TryGetProperty("parentEntityId", out var pei))
        {
            if (pei.ValueKind == JsonValueKind.Null || (pei.ValueKind == JsonValueKind.String && string.IsNullOrEmpty(pei.GetString())))
                entity.ParentEntityId = null;
            else if (Guid.TryParse(pei.GetString(), out var pid))
                entity.ParentEntityId = pid;
        }

        if (body.TryGetProperty("addresses", out var ad)) entity.Addresses = NormalizeJsonField(ad);
        if (body.TryGetProperty("contactPoints", out var cp)) entity.ContactPoints = NormalizeJsonField(cp);

        return entity;
    }

    private static string NormalizeJsonField(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
            return element.GetRawText();
        if (element.ValueKind == JsonValueKind.String)
        {
            var str = element.GetString();
            if (string.IsNullOrWhiteSpace(str)) return "[]";
            try
            {
                using var doc = JsonDocument.Parse(str);
                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                    return str;
            }
            catch { }
            return "[]";
        }
        return "[]";
    }

    private Guid? GetUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }
}
