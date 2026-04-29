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
[Route("api/contacts")]
[Authorize]
public class ContactsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ContactsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var contacts = await _db.Contacts.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(contacts);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var contact = await _db.Contacts.FindAsync(id);
        if (contact == null) return NotFound(new { error = "Contact not found" });
        return Ok(contact);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JsonElement body)
    {
        var contact = MapContact(body, new Contact());
        var errors = ValidationService.ValidateContact(
            contact.FirstName, contact.LastName, contact.FirstNameAr, contact.LastNameAr,
            contact.MiddleName, contact.MiddleNameAr, contact.Prefix, contact.PrefixAr,
            contact.Suffix, contact.SuffixAr,
            contact.NationalId, contact.DateOfBirth, contact.ContactType, contact.Gender,
            contact.Emails, contact.Phones, contact.Nationality);

        if (errors.Count > 0)
            return BadRequest(new { error = string.Join("; ", errors) });

        contact.ProfileCompleteness = ValidationService.CalculateContactCompleteness(contact);
        _db.Contacts.Add(contact);

        _db.AuditLogs.Add(new AuditLog
        {
            EntityType = "contact",
            EntityId = contact.Id,
            Action = "create",
            Changes = JsonSerializer.Serialize(contact),
            PerformedBy = GetUserId()
        });

        await _db.SaveChangesAsync();
        return StatusCode(201, contact);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] JsonElement body)
    {
        var contact = await _db.Contacts.FindAsync(id);
        if (contact == null) return NotFound(new { error = "Contact not found" });

        var oldData = JsonSerializer.Serialize(contact);
        MapContact(body, contact);
        contact.UpdatedAt = DateTime.UtcNow;

        var errors = ValidationService.ValidateContact(
            contact.FirstName, contact.LastName, contact.FirstNameAr, contact.LastNameAr,
            contact.MiddleName, contact.MiddleNameAr, contact.Prefix, contact.PrefixAr,
            contact.Suffix, contact.SuffixAr,
            contact.NationalId, contact.DateOfBirth, contact.ContactType, contact.Gender,
            contact.Emails, contact.Phones, contact.Nationality);

        if (errors.Count > 0)
            return BadRequest(new { error = string.Join("; ", errors) });

        contact.ProfileCompleteness = ValidationService.CalculateContactCompleteness(contact);

        _db.AuditLogs.Add(new AuditLog
        {
            EntityType = "contact",
            EntityId = contact.Id,
            Action = "update",
            Changes = JsonSerializer.Serialize(new { before = oldData, after = JsonSerializer.Serialize(contact) }),
            PerformedBy = GetUserId()
        });

        await _db.SaveChangesAsync();
        return Ok(contact);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var contact = await _db.Contacts.FindAsync(id);
        if (contact == null) return NotFound(new { error = "Contact not found" });

        _db.AuditLogs.Add(new AuditLog
        {
            EntityType = "contact",
            EntityId = contact.Id,
            Action = "delete",
            Changes = JsonSerializer.Serialize(contact),
            PerformedBy = GetUserId()
        });

        _db.Contacts.Remove(contact);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/relations")]
    public async Task<IActionResult> GetRelations(Guid id)
    {
        var relations = await _db.ContactEntityRelations
            .Where(r => r.ContactId == id)
            .Include(r => r.Entity)
            .ToListAsync();
        return Ok(relations);
    }

    private Contact MapContact(JsonElement body, Contact contact)
    {
        if (body.TryGetProperty("firstName", out var fn)) contact.FirstName = fn.GetString() ?? "";
        if (body.TryGetProperty("lastName", out var ln)) contact.LastName = ln.GetString() ?? "";
        if (body.TryGetProperty("middleName", out var mn)) contact.MiddleName = mn.GetString();
        if (body.TryGetProperty("prefix", out var px)) contact.Prefix = px.GetString();
        if (body.TryGetProperty("suffix", out var sx)) contact.Suffix = sx.GetString();
        if (body.TryGetProperty("firstNameAr", out var fna)) contact.FirstNameAr = fna.GetString();
        if (body.TryGetProperty("lastNameAr", out var lna)) contact.LastNameAr = lna.GetString();
        if (body.TryGetProperty("middleNameAr", out var mna)) contact.MiddleNameAr = mna.GetString();
        if (body.TryGetProperty("prefixAr", out var pxa)) contact.PrefixAr = pxa.GetString();
        if (body.TryGetProperty("suffixAr", out var sxa)) contact.SuffixAr = sxa.GetString();
        if (body.TryGetProperty("gender", out var g)) contact.Gender = g.GetString()?.Trim().ToLower();
        if (body.TryGetProperty("dateOfBirth", out var dob)) contact.DateOfBirth = dob.GetString();
        if (body.TryGetProperty("nationality", out var nat)) contact.Nationality = nat.GetString();
        if (body.TryGetProperty("nationalId", out var nid)) contact.NationalId = nid.GetString();
        if (body.TryGetProperty("contactType", out var ct)) contact.ContactType = ct.GetString()?.Trim().ToLower() ?? "citizen";
        if (body.TryGetProperty("currentPosition", out var cp)) contact.CurrentPosition = cp.GetString();
        if (body.TryGetProperty("currentEntityName", out var cen)) contact.CurrentEntityName = cen.GetString();
        if (body.TryGetProperty("isActive", out var ia)) contact.IsActive = ia.GetBoolean();

        if (body.TryGetProperty("currentEntityId", out var cei))
        {
            if (cei.ValueKind == JsonValueKind.Null || (cei.ValueKind == JsonValueKind.String && string.IsNullOrEmpty(cei.GetString())))
                contact.CurrentEntityId = null;
            else if (Guid.TryParse(cei.GetString(), out var eid))
                contact.CurrentEntityId = eid;
        }

        if (body.TryGetProperty("emails", out var em)) contact.Emails = NormalizeJsonField(em);
        if (body.TryGetProperty("phones", out var ph)) contact.Phones = NormalizeJsonField(ph);
        if (body.TryGetProperty("addresses", out var ad)) contact.Addresses = NormalizeJsonField(ad);
        if (body.TryGetProperty("classifications", out var cl)) contact.Classifications = NormalizeJsonField(cl);

        return contact;
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
