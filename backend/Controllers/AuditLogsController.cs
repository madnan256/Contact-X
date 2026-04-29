using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContactsX.Api.Data;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? entityType,
        [FromQuery] string? action,
        [FromQuery] string? entityId)
    {
        var query = _db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(a => a.EntityType == entityType);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);

        if (!string.IsNullOrWhiteSpace(entityId) && Guid.TryParse(entityId, out var parsedEntityId))
            query = query.Where(a => a.EntityId == parsedEntityId);

        var logs = await query.OrderByDescending(a => a.CreatedAt).Take(500).ToListAsync();
        return Ok(logs);
    }
}
