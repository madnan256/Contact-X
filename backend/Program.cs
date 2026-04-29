using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ContactsX.Api.Data;
using ContactsX.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "ContactsX-Super-Secret-Key-2026-Must-Be-32-Chars!";
var connectionString =
    Environment.GetEnvironmentVariable("DATABASE_URL") ??
    "Host=postgres;Port=5432;Username=admin;Password=admin;Database=contactsx;SSL Mode=Disable";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<AuthService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "ContactsX",
            ValidAudience = "ContactsX",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();

    await db.Database.ExecuteSqlRawAsync(@"
        UPDATE contacts SET contact_type = LOWER(TRIM(contact_type))
        WHERE contact_type IS NOT NULL AND contact_type != LOWER(TRIM(contact_type));
    ");
    await db.Database.ExecuteSqlRawAsync(@"
        UPDATE contacts SET contact_type = 'citizen'
        WHERE contact_type NOT IN ('citizen', 'employee', 'external', 'vip');
    ");
    await db.Database.ExecuteSqlRawAsync(@"
        UPDATE contacts SET gender = LOWER(TRIM(gender))
        WHERE gender IS NOT NULL AND gender != LOWER(TRIM(gender));
    ");

    var allContacts = await db.Contacts.ToListAsync();
    var contactsFixed = false;
    foreach (var c in allContacts)
    {
        var e1 = UnwrapJsonString(c.Emails); var p1 = UnwrapJsonString(c.Phones); var a1 = UnwrapJsonString(c.Addresses);
        if (e1 != c.Emails || p1 != c.Phones || a1 != c.Addresses)
        {
            c.Emails = e1; c.Phones = p1; c.Addresses = a1;
            contactsFixed = true;
        }
    }
    if (contactsFixed) await db.SaveChangesAsync();

    var allEntities = await db.Entities.ToListAsync();
    var entitiesFixed = false;
    foreach (var e in allEntities)
    {
        var a1 = UnwrapJsonString(e.Addresses); var cp1 = UnwrapJsonString(e.ContactPoints);
        if (a1 != e.Addresses || cp1 != e.ContactPoints)
        {
            e.Addresses = a1; e.ContactPoints = cp1;
            entitiesFixed = true;
        }
    }
    foreach (var e in allEntities)
    {
        var newScore = ValidationService.CalculateEntityCompleteness(e);
        if (newScore != e.ProfileCompleteness)
        {
            e.ProfileCompleteness = newScore;
            entitiesFixed = true;
        }
    }
    if (entitiesFixed) await db.SaveChangesAsync();

    await db.Database.ExecuteSqlRawAsync(@"
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.check_constraints
                WHERE constraint_name = 'CK_contacts_contact_type'
            ) THEN
                ALTER TABLE contacts
                ADD CONSTRAINT ""CK_contacts_contact_type""
                CHECK (contact_type IN ('citizen', 'employee', 'external', 'vip'));
            END IF;
        END $$;
    ");

    await db.Database.ExecuteSqlRawAsync(@"
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'duplicate_candidates' AND column_name = 'record1_snapshot'
            ) THEN
                ALTER TABLE duplicate_candidates ADD COLUMN record1_snapshot jsonb;
                ALTER TABLE duplicate_candidates ADD COLUMN record2_snapshot jsonb;
            END IF;
        END $$;
    ");

    var auth = scope.ServiceProvider.GetRequiredService<AuthService>();
    await auth.SeedAdminAsync();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

app.MapFallbackToFile("index.html");

var port = Environment.GetEnvironmentVariable("API_PORT") ?? "3001";
app.Run($"http://0.0.0.0:{port}");

static string UnwrapJsonString(string value)
{
    if (string.IsNullOrWhiteSpace(value)) return "[]";
    var s = value.Trim();
    if (s.StartsWith("\"") && s.EndsWith("\""))
    {
        try
        {
            var unwrapped = System.Text.Json.JsonSerializer.Deserialize<string>(s);
            if (unwrapped != null && unwrapped.TrimStart().StartsWith("["))
                return unwrapped;
        }
        catch { }
    }
    return s;
}
