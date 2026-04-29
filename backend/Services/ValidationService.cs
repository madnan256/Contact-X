using System.Text.RegularExpressions;
using ContactsX.Api.Models;

namespace ContactsX.Api.Services;

public static class ValidationService
{
    private static readonly Regex EnglishOnly = new(@"^[a-zA-Z\s\.\-',()]+$", RegexOptions.Compiled);
    private static readonly Regex ArabicOnly = new(@"^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s\.\-',()]+$", RegexOptions.Compiled);
    private static readonly Regex NumbersOnly = new(@"^\d+$", RegexOptions.Compiled);
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly string[] ValidContactTypes = { "citizen", "employee", "external", "vip" };
    private static readonly string[] ValidEntityTypes = { "public", "semi-government", "private", "international", "ngo" };
    private static readonly string[] ValidGenders = { "male", "female" };

    public static List<string> ValidateContact(
        string? firstName, string? lastName, string? firstNameAr, string? lastNameAr,
        string? middleName, string? middleNameAr, string? prefix, string? prefixAr,
        string? suffix, string? suffixAr,
        string? nationalId, string? dateOfBirth, string? contactType, string? gender,
        string? emailsJson, string? phonesJson, string? nationality = null)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(firstName))
            errors.Add("firstName is required");
        else if (!EnglishOnly.IsMatch(firstName))
            errors.Add("firstName must contain English characters only");

        if (string.IsNullOrWhiteSpace(lastName))
            errors.Add("lastName is required");
        else if (!EnglishOnly.IsMatch(lastName))
            errors.Add("lastName must contain English characters only");

        if (!string.IsNullOrWhiteSpace(middleName) && !EnglishOnly.IsMatch(middleName))
            errors.Add("middleName must contain English characters only");
        if (!string.IsNullOrWhiteSpace(prefix) && !EnglishOnly.IsMatch(prefix))
            errors.Add("prefix must contain English characters only");
        if (!string.IsNullOrWhiteSpace(suffix) && !EnglishOnly.IsMatch(suffix))
            errors.Add("suffix must contain English characters only");

        if (!string.IsNullOrWhiteSpace(firstNameAr) && !ArabicOnly.IsMatch(firstNameAr))
            errors.Add("firstNameAr must contain Arabic characters only");
        if (!string.IsNullOrWhiteSpace(lastNameAr) && !ArabicOnly.IsMatch(lastNameAr))
            errors.Add("lastNameAr must contain Arabic characters only");
        if (!string.IsNullOrWhiteSpace(middleNameAr) && !ArabicOnly.IsMatch(middleNameAr))
            errors.Add("middleNameAr must contain Arabic characters only");
        if (!string.IsNullOrWhiteSpace(prefixAr) && !ArabicOnly.IsMatch(prefixAr))
            errors.Add("prefixAr must contain Arabic characters only");
        if (!string.IsNullOrWhiteSpace(suffixAr) && !ArabicOnly.IsMatch(suffixAr))
            errors.Add("suffixAr must contain Arabic characters only");

        if (!string.IsNullOrWhiteSpace(nationalId) && !NumbersOnly.IsMatch(nationalId))
            errors.Add("nationalId must contain numbers only");

        if (!string.IsNullOrWhiteSpace(dateOfBirth))
        {
            if (DateTime.TryParse(dateOfBirth, out var dob))
            {
                if (dob > DateTime.UtcNow)
                    errors.Add("dateOfBirth cannot be in the future");
            }
            else
            {
                errors.Add("dateOfBirth must be a valid date");
            }
        }

        if (!string.IsNullOrWhiteSpace(contactType) && !ValidContactTypes.Contains(contactType))
            errors.Add("contactType must be one of: citizen, employee, external, vip");

        if (!string.IsNullOrWhiteSpace(gender) && !ValidGenders.Contains(gender))
            errors.Add("gender must be one of: male, female");

        if (!NationalityLookup.IsValid(nationality))
            errors.Add("nationality must be a valid nationality from the allowed list");

        ValidateEmails(emailsJson, errors);
        ValidatePhones(phonesJson, errors);

        return errors;
    }

    public static void ValidateEmails(string? emailsJson, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(emailsJson) || emailsJson == "[]") return;
        try
        {
            var emails = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(emailsJson);
            if (emails == null) return;
            int primaryCount = 0;
            foreach (var email in emails)
            {
                string? value = null;
                if (email.ValueKind == System.Text.Json.JsonValueKind.String)
                    value = email.GetString();
                else if (email.ValueKind == System.Text.Json.JsonValueKind.Object && email.TryGetProperty("value", out var v))
                    value = v.GetString();

                if (!string.IsNullOrWhiteSpace(value) && !EmailRegex.IsMatch(value))
                    errors.Add($"Invalid email format: {value}");

                if (email.ValueKind == System.Text.Json.JsonValueKind.Object &&
                    email.TryGetProperty("primary", out var p) && p.GetBoolean())
                    primaryCount++;
            }
            if (primaryCount > 1)
                errors.Add("Only one primary email is allowed");
        }
        catch { }
    }

    public static void ValidatePhones(string? phonesJson, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(phonesJson) || phonesJson == "[]") return;
        try
        {
            var phones = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(phonesJson);
            if (phones == null) return;
            foreach (var phone in phones)
            {
                string? value = null;
                if (phone.ValueKind == System.Text.Json.JsonValueKind.String)
                    value = phone.GetString();
                else if (phone.ValueKind == System.Text.Json.JsonValueKind.Object && phone.TryGetProperty("value", out var v))
                    value = v.GetString();

                if (!string.IsNullOrWhiteSpace(value))
                {
                    var cleaned = value.Replace("+", "").Replace("-", "").Replace(" ", "").Replace("(", "").Replace(")", "");
                    if (!NumbersOnly.IsMatch(cleaned))
                        errors.Add($"Phone number must contain only numbers: {value}");
                }
            }
        }
        catch { }
    }

    public static List<string> ValidateEntity(string? nameEn, string? nameAr, string? entityType, Guid? parentEntityId, Guid? entityId, string? contactPointsJson = null)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(nameEn))
            errors.Add("nameEn is required");
        else if (!EnglishOnly.IsMatch(nameEn))
            errors.Add("nameEn must contain English characters only");

        if (!string.IsNullOrWhiteSpace(nameAr) && !ArabicOnly.IsMatch(nameAr))
            errors.Add("nameAr must contain Arabic characters only");

        if (!string.IsNullOrWhiteSpace(entityType) && !ValidEntityTypes.Contains(entityType))
            errors.Add("entityType must be one of: public, semi-government, private, international, ngo");

        if (parentEntityId.HasValue && entityId.HasValue && parentEntityId == entityId)
            errors.Add("parentEntityId cannot equal the entity's own ID");

        ValidateContactPoints(contactPointsJson, errors);

        return errors;
    }

    public static void ValidateContactPoints(string? contactPointsJson, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(contactPointsJson) || contactPointsJson == "[]") return;
        try
        {
            var points = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(contactPointsJson);
            if (points == null) return;
            for (int i = 0; i < points.Count; i++)
            {
                var cp = points[i];
                if (cp.ValueKind != System.Text.Json.JsonValueKind.Object) continue;

                if (cp.TryGetProperty("email", out var emailProp))
                {
                    var email = emailProp.GetString();
                    if (!string.IsNullOrWhiteSpace(email) && !EmailRegex.IsMatch(email))
                        errors.Add($"Contact point #{i + 1}: invalid email format: {email}");
                }

                if (cp.TryGetProperty("phone", out var phoneProp))
                {
                    var phone = phoneProp.GetString();
                    if (!string.IsNullOrWhiteSpace(phone))
                    {
                        var cleaned = phone.Replace("+", "").Replace("-", "").Replace(" ", "").Replace("(", "").Replace(")", "");
                        if (!NumbersOnly.IsMatch(cleaned))
                            errors.Add($"Contact point #{i + 1}: phone must contain numbers only: {phone}");
                    }
                }
            }
        }
        catch { }
    }

    public static int CalculateContactCompleteness(Contact contact)
    {
        int filled = 0;
        int total = 110;

        if (!string.IsNullOrWhiteSpace(contact.FirstName)) filled += 15;
        if (!string.IsNullOrWhiteSpace(contact.LastName)) filled += 15;
        if (contact.Emails != "[]" && !string.IsNullOrWhiteSpace(contact.Emails)) filled += 15;
        if (!string.IsNullOrWhiteSpace(contact.NationalId)) filled += 10;
        if (!string.IsNullOrWhiteSpace(contact.ContactType)) filled += 10;
        if (!string.IsNullOrWhiteSpace(contact.CurrentPosition)) filled += 10;
        if (contact.Phones != "[]" && !string.IsNullOrWhiteSpace(contact.Phones)) filled += 10;
        if (!string.IsNullOrWhiteSpace(contact.Gender)) filled += 5;
        if (!string.IsNullOrWhiteSpace(contact.DateOfBirth)) filled += 5;
        if (!string.IsNullOrWhiteSpace(contact.Nationality)) filled += 5;
        if (!string.IsNullOrWhiteSpace(contact.FirstNameAr)) filled += 5;
        if (!string.IsNullOrWhiteSpace(contact.LastNameAr)) filled += 5;

        return (int)Math.Round((double)filled / total * 100);
    }

    public static int CalculateEntityCompleteness(Entity entity)
    {
        int score = 0;

        if (!string.IsNullOrWhiteSpace(entity.NameEn)) score += 20;
        if (!string.IsNullOrWhiteSpace(entity.EntityType)) score += 15;
        if (!string.IsNullOrWhiteSpace(entity.Country)) score += 15;
        if (!string.IsNullOrWhiteSpace(entity.Sector)) score += 15;
        if (!string.IsNullOrWhiteSpace(entity.NameAr)) score += 10;
        if (!string.IsNullOrWhiteSpace(entity.RegistrationId)) score += 10;
        if (HasValidJsonArray(entity.Addresses)) score += 10;
        if (HasValidJsonArray(entity.ContactPoints)) score += 5;

        return Math.Clamp(score, 0, 100);
    }

    private static bool HasValidJsonArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return false;
        try
        {
            var arr = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(json);
            return arr.ValueKind == System.Text.Json.JsonValueKind.Array && arr.GetArrayLength() > 0;
        }
        catch { return false; }
    }
}
