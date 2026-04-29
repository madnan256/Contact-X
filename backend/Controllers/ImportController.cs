using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContactsX.Api.Data;
using ContactsX.Api.Models;
using ContactsX.Api.Services;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api/import")]
[Authorize]
public class ImportController : ControllerBase
{
    private readonly AppDbContext _db;

    public ImportController(AppDbContext db) => _db = db;

    private static readonly Dictionary<string, string> ContactFieldMap = new(StringComparer.Ordinal)
    {
        ["firstName"] = "firstName", ["first_name"] = "firstName", ["First Name"] = "firstName", ["الاسم الأول"] = "firstName",
        ["lastName"] = "lastName", ["last_name"] = "lastName", ["Last Name"] = "lastName", ["اسم العائلة"] = "lastName",
        ["prefix"] = "prefix", ["Prefix"] = "prefix", ["اللقب"] = "prefix",
        ["middleName"] = "middleName", ["middle_name"] = "middleName", ["Middle Name"] = "middleName", ["الاسم الأوسط"] = "middleName",
        ["suffix"] = "suffix", ["Suffix"] = "suffix", ["اللاحقة"] = "suffix",
        ["firstNameAr"] = "firstNameAr", ["first_name_ar"] = "firstNameAr", ["First Name (Arabic)"] = "firstNameAr", ["الاسم الأول بالعربية"] = "firstNameAr",
        ["lastNameAr"] = "lastNameAr", ["last_name_ar"] = "lastNameAr", ["Last Name (Arabic)"] = "lastNameAr", ["اسم العائلة بالعربية"] = "lastNameAr",
        ["prefixAr"] = "prefixAr", ["prefix_ar"] = "prefixAr", ["Prefix (Arabic)"] = "prefixAr", ["اللقب بالعربية"] = "prefixAr",
        ["middleNameAr"] = "middleNameAr", ["middle_name_ar"] = "middleNameAr", ["Middle Name (Arabic)"] = "middleNameAr", ["الاسم الأوسط بالعربية"] = "middleNameAr",
        ["suffixAr"] = "suffixAr", ["suffix_ar"] = "suffixAr", ["Suffix (Arabic)"] = "suffixAr", ["اللاحقة بالعربية"] = "suffixAr",
        ["gender"] = "gender", ["Gender"] = "gender", ["الجنس"] = "gender",
        ["dateOfBirth"] = "dateOfBirth", ["date_of_birth"] = "dateOfBirth", ["Date of Birth"] = "dateOfBirth", ["تاريخ الميلاد"] = "dateOfBirth",
        ["nationality"] = "nationality", ["Nationality"] = "nationality", ["الجنسية"] = "nationality",
        ["nationalId"] = "nationalId", ["national_id"] = "nationalId", ["National ID"] = "nationalId", ["الرقم الوطني"] = "nationalId",
        ["contactType"] = "contactType", ["contact_type"] = "contactType", ["Contact Type"] = "contactType", ["نوع جهة الاتصال"] = "contactType",
        ["currentPosition"] = "currentPosition", ["current_position"] = "currentPosition", ["Current Position"] = "currentPosition", ["المنصب الحالي"] = "currentPosition",
        ["currentEntityName"] = "currentEntityName", ["current_entity_name"] = "currentEntityName", ["Current Entity"] = "currentEntityName", ["الجهة الحالية"] = "currentEntityName",
        ["email"] = "email", ["emails"] = "email", ["Email"] = "email", ["البريد الإلكتروني"] = "email",
        ["phone"] = "phone", ["phones"] = "phone", ["Phone"] = "phone", ["الهاتف"] = "phone",
    };

    private static readonly Dictionary<string, string> EntityFieldMap = new(StringComparer.Ordinal)
    {
        ["nameEn"] = "nameEn", ["name_en"] = "nameEn", ["Name (English)"] = "nameEn", ["الاسم بالإنجليزية"] = "nameEn",
        ["nameAr"] = "nameAr", ["name_ar"] = "nameAr", ["Name (Arabic)"] = "nameAr", ["الاسم بالعربية"] = "nameAr",
        ["entityType"] = "entityType", ["entity_type"] = "entityType", ["Entity Type"] = "entityType", ["نوع الجهة"] = "entityType",
        ["country"] = "country", ["Country"] = "country", ["الدولة"] = "country",
        ["sector"] = "sector", ["Sector"] = "sector", ["القطاع"] = "sector",
    };

    private static readonly string[] ValidContactTypes = { "citizen", "employee", "external", "vip" };
    private static readonly Regex EmailRegex = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);
    private static readonly Regex NumbersOnlyRegex = new(@"^\d+$", RegexOptions.Compiled);

    [HttpPost("contacts")]
    public async Task<IActionResult> ImportContacts([FromBody] JsonElement body)
    {
        if (body.ValueKind != JsonValueKind.Array)
            return BadRequest(new { error = "Expected JSON array" });

        var allEntities = await _db.Entities.ToListAsync();
        int imported = 0;
        var errors = new List<object>();

        int row = 0;
        foreach (var item in body.EnumerateArray())
        {
            row++;
            try
            {
                var mapped = MapFields(item, ContactFieldMap);
                var rowErrors = new List<string>();

                var firstName = mapped.GetValueOrDefault("firstName")?.Trim();
                var lastName = mapped.GetValueOrDefault("lastName")?.Trim();

                if (string.IsNullOrWhiteSpace(firstName))
                    rowErrors.Add("firstName is required");
                if (string.IsNullOrWhiteSpace(lastName))
                    rowErrors.Add("lastName is required");

                var genderRaw = mapped.GetValueOrDefault("gender");
                string? gender = null;
                if (!string.IsNullOrWhiteSpace(genderRaw))
                {
                    gender = NormalizeGender(genderRaw);
                    if (gender == null)
                        rowErrors.Add($"Invalid gender value: '{genderRaw}'");
                }

                var contactTypeRaw = mapped.GetValueOrDefault("contactType");
                string? contactType = null;
                if (!string.IsNullOrWhiteSpace(contactTypeRaw))
                {
                    contactType = NormalizeContactType(contactTypeRaw);
                    if (contactType == null)
                        rowErrors.Add($"Invalid contactType value: '{contactTypeRaw}'");
                }

                var dobStr = mapped.GetValueOrDefault("dateOfBirth")?.Trim();
                if (!string.IsNullOrWhiteSpace(dobStr))
                {
                    if (!DateTime.TryParse(dobStr, out var dob) || dob > DateTime.UtcNow)
                        rowErrors.Add("Invalid or future Date of Birth");
                }

                var nationalId = mapped.GetValueOrDefault("nationalId")?.Trim();
                if (!string.IsNullOrWhiteSpace(nationalId) && !NumbersOnlyRegex.IsMatch(nationalId))
                    rowErrors.Add("National ID must contain numbers only");

                var emailStr = mapped.GetValueOrDefault("email")?.Trim();
                if (!string.IsNullOrWhiteSpace(emailStr) && !EmailRegex.IsMatch(emailStr))
                    rowErrors.Add("Invalid email format");

                var phoneStr = mapped.GetValueOrDefault("phone")?.Trim();
                if (!string.IsNullOrWhiteSpace(phoneStr))
                {
                    var cleanedPhone = Regex.Replace(phoneStr, @"[\s\-\(\)\+]", "");
                    if (!NumbersOnlyRegex.IsMatch(cleanedPhone))
                        rowErrors.Add("Phone must contain numbers only");
                }

                if (rowErrors.Count > 0)
                {
                    errors.Add(new { row, error = string.Join("; ", rowErrors) });
                    continue;
                }

                var emails = !string.IsNullOrWhiteSpace(emailStr)
                    ? JsonSerializer.Serialize(new[] { new { value = emailStr, primary = true } })
                    : "[]";
                var phones = !string.IsNullOrWhiteSpace(phoneStr)
                    ? JsonSerializer.Serialize(new[] { new { value = phoneStr, countryCode = "+966", primary = true } })
                    : "[]";

                Guid? currentEntityId = null;
                string? currentEntityName = mapped.GetValueOrDefault("currentEntityName")?.Trim();
                if (!string.IsNullOrWhiteSpace(currentEntityName))
                {
                    var matchedEntity = allEntities.FirstOrDefault(e =>
                        e.NameEn.Equals(currentEntityName, StringComparison.OrdinalIgnoreCase) ||
                        (!string.IsNullOrWhiteSpace(e.NameAr) && e.NameAr == currentEntityName));
                    if (matchedEntity != null)
                    {
                        currentEntityId = matchedEntity.Id;
                        currentEntityName = null;
                    }
                }

                var contact = new Contact
                {
                    FirstName = firstName!,
                    LastName = lastName!,
                    MiddleName = mapped.GetValueOrDefault("middleName")?.Trim(),
                    Prefix = mapped.GetValueOrDefault("prefix")?.Trim(),
                    Suffix = mapped.GetValueOrDefault("suffix")?.Trim(),
                    FirstNameAr = mapped.GetValueOrDefault("firstNameAr")?.Trim(),
                    LastNameAr = mapped.GetValueOrDefault("lastNameAr")?.Trim(),
                    MiddleNameAr = mapped.GetValueOrDefault("middleNameAr")?.Trim(),
                    PrefixAr = mapped.GetValueOrDefault("prefixAr")?.Trim(),
                    SuffixAr = mapped.GetValueOrDefault("suffixAr")?.Trim(),
                    Gender = gender,
                    DateOfBirth = dobStr,
                    Nationality = mapped.GetValueOrDefault("nationality")?.Trim(),
                    NationalId = nationalId,
                    ContactType = contactType ?? "citizen",
                    CurrentPosition = mapped.GetValueOrDefault("currentPosition")?.Trim(),
                    CurrentEntityId = currentEntityId,
                    CurrentEntityName = currentEntityName,
                    Emails = emails,
                    Phones = phones
                };

                contact.ProfileCompleteness = ValidationService.CalculateContactCompleteness(contact);
                _db.Contacts.Add(contact);
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add(new { row, error = ex.Message });
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { imported, errors });
    }

    private static readonly Regex EnglishOnlyRegex = new(@"^[A-Za-z\s\-'.,&()]+$", RegexOptions.Compiled);
    private static readonly Regex ArabicOnlyRegex = new(@"^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s\-'.,&()]+$", RegexOptions.Compiled);
    private static readonly string[] ValidEntityTypes = { "public", "semi-government", "private", "international", "ngo" };

    [HttpPost("entities")]
    public async Task<IActionResult> ImportEntities([FromBody] JsonElement body)
    {
        if (body.ValueKind != JsonValueKind.Array)
            return BadRequest(new { error = "Expected JSON array" });

        var existingNames = (await _db.Entities.Select(e => e.NameEn).ToListAsync())
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Select(n => n.ToLower()).ToHashSet();

        int imported = 0;
        var errors = new List<object>();
        var newNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        int row = 0;
        foreach (var item in body.EnumerateArray())
        {
            row++;
            try
            {
                var mapped = MapFields(item, EntityFieldMap);
                var rowErrors = new List<string>();

                var nameEn = mapped.GetValueOrDefault("nameEn")?.Trim();
                if (string.IsNullOrWhiteSpace(nameEn))
                    rowErrors.Add("nameEn is required");
                else if (!EnglishOnlyRegex.IsMatch(nameEn))
                    rowErrors.Add("nameEn must contain English characters only");
                else if (existingNames.Contains(nameEn.ToLower()) || newNames.Contains(nameEn))
                    rowErrors.Add($"Entity with nameEn '{nameEn}' already exists");

                var nameAr = mapped.GetValueOrDefault("nameAr")?.Trim();
                if (!string.IsNullOrWhiteSpace(nameAr) && !ArabicOnlyRegex.IsMatch(nameAr))
                    rowErrors.Add("nameAr must contain Arabic characters only");

                var entityTypeRaw = mapped.GetValueOrDefault("entityType")?.Trim();
                string? entityType = null;
                if (!string.IsNullOrWhiteSpace(entityTypeRaw))
                {
                    entityType = NormalizeEntityType(entityTypeRaw);
                    if (entityType == null)
                        rowErrors.Add($"Invalid entityType value: '{entityTypeRaw}'");
                }

                if (rowErrors.Count > 0)
                {
                    errors.Add(new { row, error = string.Join("; ", rowErrors) });
                    continue;
                }

                var entity = new Entity
                {
                    NameEn = nameEn!,
                    NameAr = nameAr,
                    EntityType = entityType ?? "public",
                    Country = mapped.GetValueOrDefault("country")?.Trim(),
                    Sector = mapped.GetValueOrDefault("sector")?.Trim()
                };

                entity.ProfileCompleteness = ValidationService.CalculateEntityCompleteness(entity);
                _db.Entities.Add(entity);
                newNames.Add(nameEn!);
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add(new { row, error = ex.Message });
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { imported, errors });
    }

    private static Dictionary<string, string?> MapFields(JsonElement item, Dictionary<string, string> fieldMap)
    {
        var result = new Dictionary<string, string?>();
        foreach (var prop in item.EnumerateObject())
        {
            if (fieldMap.TryGetValue(prop.Name, out var mappedName))
            {
                result[mappedName] = prop.Value.ValueKind == JsonValueKind.Null ? null : prop.Value.ToString();
            }
        }
        return result;
    }

    private static string? NormalizeGender(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var trimmed = input.Trim();
        var lower = trimmed.ToLower();
        if (lower is "male" or "m" || trimmed == "ذكر") return "male";
        if (lower is "female" or "f" || trimmed == "أنثى") return "female";
        return null;
    }

    private static string? NormalizeContactType(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var lower = input.Trim().ToLower();
        if (ValidContactTypes.Contains(lower)) return lower;
        return null;
    }

    private static string? NormalizeEntityType(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var lower = input.Trim().ToLower();
        return lower switch
        {
            "public" => "public",
            "semi-government" or "semi_government" or "semigovernment" or "semi government" => "semi-government",
            "private" => "private",
            "international" => "international",
            "ngo" => "ngo",
            _ => null
        };
    }
}
