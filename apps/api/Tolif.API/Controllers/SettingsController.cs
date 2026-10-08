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
