using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ContactsX.Api.Data;
using ContactsX.Api.Models;

namespace ContactsX.Api.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly string _jwtSecret;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _jwtSecret = config["Jwt:Secret"] ?? "ContactsX-Super-Secret-Key-2026-Must-Be-32-Chars!";
    }

    public async Task<(User? user, string? token)> LoginAsync(string username, string password)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username && u.IsActive);
        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return (null, null);

        var token = GenerateToken(user);
        return (user, token);
    }

    public string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: "ContactsX",
            audience: "ContactsX",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task SeedAdminAsync()
    {
        if (!await _db.Users.AnyAsync(u => u.Username == "admin"))
        {
            _db.Users.Add(new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Role = "admin",
                IsActive = true
            });
            await _db.SaveChangesAsync();
        }
    }
}
