using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/leads")]
[Authorize(Roles = "Admin")]
public class AdminLeadsController(
    IApplicationDbContext    db,
    IEmailService            email,
    ISettingsService         settings,
    IStorageService          storage,
    IImageGenerationProvider imageGenerationProvider,
    IWatermarkService        watermarkService) : ControllerBase
{
    private static readonly OrderStatus[] PaidStatuses =
    [
        OrderStatus.Paid, OrderStatus.GeneratingHighRes,
        OrderStatus.Ready, OrderStatus.SubmittedToPrinter,
        OrderStatus.Shipped,
    ];

    // ── GET /api/admin/leads/stats ────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        var now    = DateTime.UtcNow;
        var today  = DateTime.SpecifyKind(now.Date, DateTimeKind.Utc);
        var cutoff = now.AddMinutes(-30);

        var totalSessions = await db.PortraitSessions.CountAsync(ct);

        var gotPreview = await db.PortraitSessions
            .CountAsync(s => s.Status == PortraitSessionStatus.PreviewReady
                          || s.Status == PortraitSessionStatus.GeneratingHighRes
                          || s.Status == PortraitSessionStatus.Completed, ct);

        var capturedEmail = await db.PortraitSessions
            .CountAsync(s => s.CustomerEmail != null, ct);

        var addedToCart = await db.OrderItems
            .Select(i => i.PortraitSessionId)
            .Distinct()
            .CountAsync(ct);

        var converted = await db.OrderItems
            .Where(i => PaidStatuses.Contains(i.Order.Status))
            .Select(i => i.PortraitSessionId)
            .Distinct()
            .CountAsync(ct);

        var abandonedCarts = await db.Orders
            .CountAsync(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff, ct);

        var todayLeads = await db.PortraitSessions
            .CountAsync(s => s.CustomerEmail != null && s.CreatedAt >= today, ct);

        var conversionRate = capturedEmail > 0
            ? Math.Round((double)converted / capturedEmail * 100, 1)
            : 0.0;

        return Ok(new
        {
            totalSessions,
            gotPreview,
            capturedEmail,
            addedToCart,
            converted,
            abandonedCarts,
            todayLeads,
            conversionRate,
        });
    }

    // ── GET /api/admin/leads/sessions ─────────────────────────────────────────
    [HttpGet("sessions")]
    public async Task<IActionResult> GetLeadSessions(
        [FromQuery] int       page     = 1,
        [FromQuery] int       pageSize = 20,
        [FromQuery] string?   search   = null,
        [FromQuery] DateTime? from     = null,
        [FromQuery] DateTime? to       = null,
        CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.PortraitSessions
            .Where(s => s.CustomerEmail != null)
            .Where(s => !db.OrderItems
                .Any(i => i.PortraitSessionId == s.Id && PaidStatuses.Contains(i.Order.Status)));

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.CustomerEmail!.Contains(search));

        if (from.HasValue)
            query = query.Where(s => s.CreatedAt >= DateTime.SpecifyKind(from.Value, DateTimeKind.Utc));

        if (to.HasValue)
            query = query.Where(s => s.CreatedAt < DateTime.SpecifyKind(to.Value, DateTimeKind.Utc).AddDays(1));

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.Id,
                s.CustomerEmail,
                templateName    = s.Template.Name,
                status          = s.Status.ToString(),
                s.RegenerationCount,
                hasPreview      = s.WatermarkedPreviewKey != null,
                s.CreatedAt,
                s.SourceRef,
                hasPendingOrder = db.OrderItems
                    .Any(i => i.PortraitSessionId == s.Id && i.Order.Status == OrderStatus.Pending),
                pendingOrderId  = (Guid?)db.OrderItems
                    .Where(i => i.PortraitSessionId == s.Id && i.Order.Status == OrderStatus.Pending)
                    .Select(i => i.OrderId)
                    .FirstOrDefault(),
            })
            .ToListAsync(ct);

        return Ok(new { items, total, page, pageSize });
    }

    // ── GET /api/admin/leads/sessions/{id} ────────────────────────────────────
    [HttpGet("sessions/{id:guid}")]
    public async Task<IActionResult> GetSession(Guid id, CancellationToken ct)
    {
        var session = await db.PortraitSessions
            .Include(s => s.Template)
            .Include(s => s.GenerationLogs)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (session is null) return NotFound();

        // Build signed URLs for uploaded files
        var uploadedFiles = new Dictionary<string, string?>();
        if (!string.IsNullOrEmpty(session.UploadedFilesJson))
        {
            try
            {
                var keys = JsonSerializer.Deserialize<Dictionary<string, string>>(session.UploadedFilesJson);
                if (keys is not null)
                {
                    foreach (var (slot, key) in keys)
                    {
                        try
                        {
                            var url = await storage.GenerateDownloadUrlAsync(key, TimeSpan.FromHours(1), ct);
                            uploadedFiles[slot] = url;
                        }
                        catch
                        {
                            uploadedFiles[slot] = null;
                        }
                    }
                }
            }
            catch { /* malformed JSON — ignore */ }
        }

        var generationLogs = session.GenerationLogs
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id,
                l.Provider,
                l.Model,
                status    = l.Status.ToString(),
                l.DurationMs,
                l.CostUsd,
                l.IsHighRes,
                l.ErrorMessage,
                l.CreatedAt,
            });

        return Ok(new
        {
            session.Id,
            session.CustomerEmail,
            templateName       = session.Template.Name,
            templateSlug       = session.Template.Slug,
            status             = session.Status.ToString(),
            session.RegenerationCount,
            hasPreview         = session.WatermarkedPreviewKey != null,
            session.CreatedAt,
            session.SourceRef,
            uploadedFiles,
            generationLogs,
        });
    }

    // ── DELETE /api/admin/leads/sessions/{id} ─────────────────────────────────
    [HttpDelete("sessions/{id:guid}")]
    public async Task<IActionResult> DeleteSession(Guid id, CancellationToken ct)
    {
        var session = await db.PortraitSessions
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (session is null) return NotFound();

        db.PortraitSessions.Remove(session);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    // ── POST /api/admin/leads/sessions/{id}/send-email ────────────────────────
    [HttpPost("sessions/{id:guid}/send-email")]
    public async Task<IActionResult> SendLeadEmail(Guid id, CancellationToken ct)
    {
        var session = await db.PortraitSessions
            .Include(s => s.Template)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (session is null) return NotFound();
        if (string.IsNullOrEmpty(session.CustomerEmail))
            return BadRequest(new { error = "This session has no email address." });

        var siteUrl  = await settings.GetAsync("site.url", ct) ?? "https://tolif.com";
        var apiUrl   = await settings.GetAsync("api.url",  ct) ?? siteUrl;

        var previewSection = session.WatermarkedPreviewKey != null
            ? $"""
              <tr>
                <td style="background:#1A1714;padding:0;line-height:0;font-size:0;">
                  <a href="{siteUrl}" style="display:block;">
                    <img
                      src="{apiUrl}/api/portraits/{session.Id}/preview"
                      alt="Your Tolif portrait"
                      width="600"
                      style="display:block;width:100%;max-width:600px;height:auto;
                             object-fit:cover;max-height:380px;"
                    />
                  </a>
                </td>
              </tr>
              """
            : "";

        var html = $"""
            <!DOCTYPE html>
            <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Your portrait is waiting for you</title>
            </head>
            <body style="margin:0;padding:0;background:#F5F0EA;font-family:Georgia,'Times New Roman',serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F0EA;">
                <tr>
                  <td align="center" style="padding:40px 16px;">
                    <table role="presentation" width="100%" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E4D8CC;">

                      <!-- Logo header -->
                      <tr>
                        <td style="background:#1A1714;padding:28px 40px;">
                          <span style="font-family:Georgia,serif;font-size:26px;font-weight:400;color:#FFFFFF;letter-spacing:-0.5px;">tolif</span>
                        </td>
                      </tr>

                      {previewSection}

                      <!-- Body -->
                      <tr>
                        <td style="padding:36px 40px 20px;">
                          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1A1714;line-height:1.3;">
                            Your {session.Template.Name} portrait is waiting for you
                          </h1>
                          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#5A4E46;">
                            You created a beautiful AI portrait — don&apos;t leave without making it yours forever.
                            Order a high-quality print or digital download and keep this memory.
                          </p>
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="border-radius:12px;background:#C4622D;">
                                <a href="{siteUrl}/create?session={session.Id}"
                                   style="display:inline-block;padding:14px 32px;font-family:Georgia,serif;
                                          font-size:15px;font-weight:400;color:#FFFFFF;text-decoration:none;
                                          letter-spacing:0.3px;">
                                  View &amp; order my portrait →
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding:24px 40px 36px;border-top:1px solid #F0E8DF;">
                          <p style="margin:0;font-size:12px;color:#A89080;line-height:1.6;">
                            © tolif · AI portrait studio<br/>
                            <a href="{siteUrl}" style="color:#A89080;">{siteUrl}</a>
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        try
        {
            await email.SendAsync(new EmailMessage(
                To:       session.CustomerEmail,
                Subject:  $"Your {session.Template.Name} portrait is waiting for you — tolif",
                HtmlBody: html
            ), ct);

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── POST /api/admin/leads/sessions/send-campaign ──────────────────────────
    /// <summary>Send recovery email to ALL unconverted leads with an email address.</summary>
    [HttpPost("sessions/send-campaign")]
    public async Task<IActionResult> SendCampaign(CancellationToken ct)
    {
        var sessions = await db.PortraitSessions
            .Include(s => s.Template)
            .Where(s => s.CustomerEmail != null)
            .Where(s => !db.OrderItems
                .Any(i => i.PortraitSessionId == s.Id && PaidStatuses.Contains(i.Order.Status)))
            .ToListAsync(ct);

        var siteUrl = await settings.GetAsync("site.url", ct) ?? "https://tolif.com";
        var apiUrl  = await settings.GetAsync("api.url",  ct) ?? siteUrl;

        var sent   = 0;
        var failed = 0;

        foreach (var session in sessions)
        {
            try
            {
                var previewSection = session.WatermarkedPreviewKey != null
                    ? $"""
                      <tr>
                        <td style="background:#1A1714;padding:0;line-height:0;font-size:0;">
                          <img src="{apiUrl}/api/portraits/{session.Id}/preview" alt="Your portrait"
                               width="600" style="display:block;width:100%;max-width:600px;height:auto;max-height:380px;" />
                        </td>
                      </tr>
                      """
                    : "";

                var html = $"""
                    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
                    <body style="margin:0;padding:0;background:#F5F0EA;font-family:Georgia,serif;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F0EA;">
                    <tr><td align="center" style="padding:40px 16px;">
                    <table role="presentation" width="100%" style="max-width:600px;background:#FFF;border-radius:16px;overflow:hidden;border:1px solid #E4D8CC;">
                    <tr><td style="background:#1A1714;padding:28px 40px;"><span style="font-size:26px;color:#FFF;">tolif</span></td></tr>
                    {previewSection}
                    <tr><td style="padding:36px 40px 20px;">
                    <h1 style="margin:0 0 16px;font-size:24px;font-weight:400;color:#1A1714;">Your portrait is waiting</h1>
                    <p style="font-size:15px;line-height:1.7;color:#5A4E46;margin:0 0 20px;">
                    You created a <strong>{session.Template.Name}</strong> portrait — come back and make it yours.
                    </p>
                    <a href="{siteUrl}/create?session={session.Id}" style="display:inline-block;padding:14px 32px;background:#C4622D;color:#FFF;text-decoration:none;border-radius:12px;font-size:15px;">
                    View &amp; order my portrait →
                    </a>
                    </td></tr>
                    <tr><td style="padding:24px 40px 36px;border-top:1px solid #F0E8DF;">
                    <p style="margin:0;font-size:12px;color:#A89080;">© tolif · <a href="{siteUrl}" style="color:#A89080;">{siteUrl}</a></p>
                    </td></tr>
                    </table></td></tr></table>
                    </body></html>
                    """;

                await email.SendAsync(new EmailMessage(
                    To:       session.CustomerEmail!,
                    Subject:  $"Your {session.Template.Name} portrait is waiting — tolif",
                    HtmlBody: html
                ), ct);

                sent++;
            }
            catch { failed++; }
        }

        return Ok(new { sent, failed, total = sessions.Count });
    }

    // ── POST /api/admin/leads/sessions/{id}/regenerate ────────────────────────
    /// <summary>
    /// Step 1 of admin regeneration. Generates a new portrait into a TEMP key
    /// so the user's existing preview is NOT overwritten yet. Returns a signed
    /// URL for the admin to preview. Call /regenerate-apply to commit it.
    /// </summary>
    [HttpPost("sessions/{id:guid}/regenerate")]
    public async Task<IActionResult> AdminRegenerate(Guid id, CancellationToken ct)
    {
        var session = await db.PortraitSessions
            .Include(s => s.Template)
            .Include(s => s.GenerationLogs)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (session is null) return NotFound();

        if (string.IsNullOrWhiteSpace(session.Template?.TemplateImageKey))
            return BadRequest(new { error = "Template has no reference image." });

        var uploadedKeys = new Dictionary<string, string>();
        if (!string.IsNullOrEmpty(session.UploadedFilesJson))
        {
            try { uploadedKeys = JsonSerializer.Deserialize<Dictionary<string, string>>(session.UploadedFilesJson) ?? []; }
            catch { /* ignore */ }
        }

        if (uploadedKeys.Count == 0)
            return BadRequest(new { error = "No uploaded photos found for this session." });

        // Build slot metadata
        var baseSlots = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var slotDefs = JsonSerializer.Deserialize<List<SlotDefinition>>(session.Template.UploadSlotsJson ?? "[]");
            if (slotDefs is not null)
                foreach (var sd in slotDefs) baseSlots[sd.name] = sd.type;
        }
        catch { }

        var subjectSlots = uploadedKeys.Keys.Select(slotName =>
        {
            if (baseSlots.TryGetValue(slotName, out var t)) return new SubjectSlot(slotName, t);
            if (slotName.StartsWith("extra_pet", StringComparison.OrdinalIgnoreCase)) return new SubjectSlot(slotName, "pet");
            return new SubjectSlot(slotName, "person");
        }).ToList();

        var genRequest = new GenerationRequest(
            SessionId:            session.Id,
            TemplateImageKey:     session.Template.TemplateImageKey,
            Prompt:               session.Template.Prompt ?? session.Template.Name,
            UploadedImageKeys:    [.. uploadedKeys.Values],
            SubjectSlots:         subjectSlots,
            ExpectedSubjectCount: subjectSlots.Count);

        var result = await imageGenerationProvider.GenerateAsync(genRequest, ct);

        db.AiGenerationLogs.Add(new AiGenerationLog
        {
            Id                = Guid.NewGuid(),
            PortraitSessionId = session.Id,
            Provider          = imageGenerationProvider.ProviderType,
            Model             = await settings.GetAsync("ai.gemini.model", ct) ?? "gemini-2.0-flash-exp",
            Status            = result.Status,
            DurationMs        = result.DurationMs,
            ErrorMessage      = result.ErrorMessage,
            CreatedAt         = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        if (!result.Success || result.ImageData is null)
            return StatusCode(500, new { error = "Regeneration failed.", detail = result.ErrorMessage });

        // Store in a TEMP key — do NOT touch the user's current preview yet
        var watermarked = watermarkService.Apply(result.ImageData);
        var tempKey     = $"portraits/{session.Id}/regen-preview.jpg";
        await storage.UploadAsync(tempKey, watermarked, "image/jpeg", ct);

        var previewUrl = await storage.GenerateDownloadUrlAsync(tempKey, TimeSpan.FromHours(2), ct);

        return Ok(new { success = true, previewUrl });
    }

    // ── POST /api/admin/leads/sessions/{id}/regenerate-apply ─────────────────
    /// <summary>
    /// Step 2: admin confirmed the new portrait looks good — swap it into the
    /// live preview key so the customer sees it.
    /// </summary>
    [HttpPost("sessions/{id:guid}/regenerate-apply")]
    public async Task<IActionResult> AdminRegenerateApply(Guid id, CancellationToken ct)
    {
        var session = await db.PortraitSessions
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (session is null) return NotFound();

        var tempKey = $"portraits/{session.Id}/regen-preview.jpg";

        // Download the temp image and re-upload it to the live preview key
        // (no CopyAsync on IStorageService — download+reupload is the safe path)
        byte[]? tempData;
        try { tempData = await storage.DownloadAsync(tempKey, ct); }
        catch { return BadRequest(new { error = "Temp preview not found. Please regenerate first." }); }

        var liveKey = $"portraits/{session.Id}/preview.jpg";
        await storage.UploadAsync(liveKey, tempData, "image/jpeg", ct);

        session.WatermarkedPreviewKey = liveKey;
        session.Status                = PortraitSessionStatus.PreviewReady;
        session.RegenerationCount++;
        session.UpdatedAt             = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { success = true });
    }
}

// ── Local record alias so the controller can deserialize slot definitions ─────
file record SlotDefinition(string name, string type, string? label = null, bool required = false);
