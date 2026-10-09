using Microsoft.AspNetCore.Mvc;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers;

/// <summary>
/// Public (no auth) endpoint that exposes only the tracking / analytics pixel IDs.
/// Pixel IDs are not sensitive — they are embedded in every page's HTML.
/// </summary>
[ApiController]
[Route("api/settings")]
public class SettingsController(ISettingsService settingsService) : ControllerBase
{
    // Keys that are safe to expose publicly (pixel IDs, never secrets/keys)
    private static readonly string[] TrackingKeys =
    [
        "tracking.fbPixelId",
        "tracking.gaId",
        "tracking.gtmId",
        "tracking.googleAdsId",
        "tracking.tiktokPixelId",
    ];

    // GET /api/settings/maintenance
    [HttpGet("maintenance")]
    public async Task<IActionResult> GetMaintenance(CancellationToken ct)
    {
        var enabled = await settingsService.GetAsync<bool>("store.maintenance.enabled", ct) ?? false;
        var message = await settingsService.GetAsync("store.maintenance.message", ct)
                      ?? "We're currently doing some maintenance. We'll be back shortly!";
        return Ok(new { enabled, message });
    }

    // POST /api/settings/maintenance/unlock
    [HttpPost("maintenance/unlock")]
    public async Task<IActionResult> UnlockMaintenance([FromBody] UnlockRequest req, CancellationToken ct)
    {
        var password = await settingsService.GetAsync("store.maintenance.password", ct) ?? "";
        if (string.IsNullOrWhiteSpace(password) || req.Password != password)
            return Unauthorized(new { message = "Incorrect password." });

        var response = HttpContext.Response;
        response.Cookies.Append("maintenance_bypass", "1", new Microsoft.AspNetCore.Http.CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(1),
        });
        return Ok(new { success = true });
    }

    public record UnlockRequest(string Password);

    // GET /api/settings/tracking
    [HttpGet("tracking")]
    public async Task<IActionResult> GetTracking(CancellationToken ct)
    {
        var result = new Dictionary<string, string>();

        foreach (var key in TrackingKeys)
        {
            var value = await settingsService.GetAsync(key, ct);
            if (!string.IsNullOrWhiteSpace(value))
                result[key] = value;
        }

        return Ok(result);
    }
}
