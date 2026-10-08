using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Tolif.Infrastructure.Persistence;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/auth")]
public class AdminAuthController(
    UserManager<AdminUser> userManager,
    SignInManager<AdminUser> signInManager,
    IConfiguration config) : ControllerBase
{
    // ── POST /api/admin/auth/login ────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        if (user is null)
            return Unauthorized(new { message = "Invalid credentials." });

        var result = await signInManager.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid credentials." });

        var token = GenerateJwt(user);

        Response.Cookies.Append("admin_token", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development",
                StringComparison.OrdinalIgnoreCase),
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });

        return Ok(new
        {
            token,
            email = user.Email,
            displayName = user.DisplayName ?? "Admin"
        });
    }

    // ── POST /api/admin/auth/logout ───────────────────────────────────────────
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("admin_token");
        return Ok(new { message = "Logged out." });
    }

    // ── GET /api/admin/auth/me ────────────────────────────────────────────────
    [HttpGet("me")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
            return Unauthorized();

        return Ok(new
        {
            email = user.Email,
            displayName = user.DisplayName ?? "Admin"
        });
    }

    // ── JWT helper ────────────────────────────────────────────────────────────
    private string GenerateJwt(AdminUser user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(config["JWT_SECRET"] ?? "tolif-dev-secret-change-in-production"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("displayName", user.DisplayName ?? "Admin")
        };
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record LoginRequest(string Email, string Password);
