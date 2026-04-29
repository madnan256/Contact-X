using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContactsX.Api.Services;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth) => _auth = auth;

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { error = "Username and password are required" });

        var (user, token) = await _auth.LoginAsync(req.Username, req.Password);
        if (user == null || token == null)
            return Unauthorized(new { error = "Invalid username or password" });

        return Ok(new { token, user = new { user.Id, user.Username, user.Role } });
    }
}

public record LoginRequest(string Username, string Password);
