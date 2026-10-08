using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = "Admin")]
public class AdminSettingsController(
    ISettingsService settingsService,
    IApplicationDbContext db) : ControllerBase
{
    // ── GET /api/admin/settings ───────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool unmask = false, CancellationToken ct = default)
    {
        // Fetch all settings from DB to get isSensitive flag and decrypted values
        var allSettings = await db.Settings
            .OrderBy(s => s.Key)
            .ToListAsync(ct);

        // Also resolve plaintext values via service (handles decryption)
        var decrypted = await settingsService.GetAllAsync(ct);

        var result = allSettings.Select(s => new
        {
            s.Key,
            value = s.IsSensitive && !unmask
                ? "••••••••"
                : (decrypted.TryGetValue(s.Key, out var v) ? v : s.Value),
            s.IsSensitive,
            s.Description
        });

        return Ok(result);
    }

    // ── POST /api/admin/settings ──────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertSettingRequest req, CancellationToken ct)
    {
        // Determine whether this key is already marked sensitive (preserve existing sensitivity flag)
        var existing = await db.Settings.FirstOrDefaultAsync(s => s.Key == req.Key, ct);
        var isSensitive = existing?.IsSensitive ?? false;

        await settingsService.SetAsync(req.Key, req.Value, isSensitive, ct);

        return Ok(new { req.Key, message = "Setting saved." });
    }
}

public record UpsertSettingRequest(string Key, string Value);
