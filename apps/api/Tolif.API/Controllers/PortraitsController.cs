using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/portraits")]
public class PortraitsController(
    IApplicationDbContext db,
    IStorageService storageService,
    IImageGenerationProvider imageGenerationProvider,
    IWatermarkService watermarkService,
    ISettingsService settingsService,
    IAnalyticsService analytics) : ControllerBase
{
    // ── POST /api/portraits/start ─────────────────────────────────────────────
    /// <summary>
    /// Accepts a template ID and customer-uploaded photos (multipart/form-data),
    /// runs AI generation, saves the watermarked preview to MinIO,
    /// and returns the session ID + preview key + regen limit.
    ///
    /// Form fields:
    ///   templateId  (string, GUID)
    ///   files       one IFormFile per upload slot, field name = slot.name
    /// </summary>
    [HttpPost("start")]
    [EnableRateLimiting("portraits")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB
    public async Task<IActionResult> Start([FromForm] StartPortraitRequest req, CancellationToken ct)
    {
        if (!Guid.TryParse(req.TemplateId, out var templateId))
            return BadRequest(new { message = "Invalid templateId." });

        // Load template
        var template = await db.Templates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == templateId && t.IsActive, ct);

        if (template is null)
            return NotFound(new { message = "Template not found." });

        if (string.IsNullOrWhiteSpace(template.TemplateImageKey))
            return BadRequest(new { message = "Template has no reference image. Ask admin to add one." });

        // Read regen limit from settings (default 5)
        var regenLimit = await settingsService.GetAsync<int>("regen.maxPerSession", ct) ?? 5;

        // Validate email if provided
        string? customerEmail = null;
        if (!string.IsNullOrWhiteSpace(req.CustomerEmail))
        {
            var emailTrimmed = req.CustomerEmail.Trim();
            if (emailTrimmed.Length <= 254 && emailTrimmed.Contains('@'))
                customerEmail = emailTrimmed;
        }

        // Capture traffic source (utm params passed as form field, or HTTP Referer fallback)
        string? sourceRef = null;
        if (!string.IsNullOrWhiteSpace(req.Source))
            sourceRef = req.Source.Trim()[..Math.Min(500, req.Source.Trim().Length)];
        else if (Request.Headers.TryGetValue("Referer", out var referer) && !string.IsNullOrWhiteSpace(referer))
            sourceRef = referer.ToString()[..Math.Min(500, referer.ToString().Length)];

        // Create session
        var session = new PortraitSession
        {
            Id            = Guid.NewGuid(),
            TemplateId    = templateId,
            Status        = PortraitSessionStatus.Uploading,
            IpAddress     = HttpContext.Connection.RemoteIpAddress?.ToString(),
            CustomerEmail = customerEmail,
            SourceRef     = sourceRef,
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow,
        };
        db.PortraitSessions.Add(session);
        await db.SaveChangesAsync(ct);

        // Upload customer photos to MinIO
        var uploadedKeys = new Dictionary<string, string>(); // slotName → storageKey
        var uploadedKeysList = new List<string>();

        foreach (var file in Request.Form.Files)
        {
            if (file.Length == 0) continue;
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp")) ext = ".jpg";

            var key = $"portraits/{session.Id}/input/{file.Name}{ext}";
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            await storageService.UploadAsync(key, ms.ToArray(), file.ContentType, ct);

            uploadedKeys[file.Name] = key;
            uploadedKeysList.Add(key);
        }

        session.UploadedFilesJson = JsonSerializer.Serialize(uploadedKeys);
        session.Status = PortraitSessionStatus.Generating;
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Build subject slot metadata for the AI prompt
        // Base slots come from the template definition; extras are named extra_person_N / extra_pet_N
        var baseSlotTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        List<SlotDefinition>? templateSlotDefs = null;
        try
        {
            templateSlotDefs = System.Text.Json.JsonSerializer
                .Deserialize<List<SlotDefinition>>(template.UploadSlotsJson ?? "[]");
            if (templateSlotDefs is not null)
                foreach (var sd in templateSlotDefs) baseSlotTypes[sd.name] = sd.type;
        }
        catch { /* ignore parse errors — slots will fall back to "person" */ }

        var subjectSlots = uploadedKeys.Keys.Select(slotName =>
        {
            if (baseSlotTypes.TryGetValue(slotName, out var t)) return new SubjectSlot(slotName, t);
            if (slotName.StartsWith("extra_pet",    StringComparison.OrdinalIgnoreCase)) return new SubjectSlot(slotName, "pet");
            return new SubjectSlot(slotName, "person");
        }).ToList();

        // How many subjects the template was designed for (used by AI to handle fewer uploaded photos)
        var expectedSubjectCount = templateSlotDefs?.Count ?? subjectSlots.Count;

        // Run AI generation
        var genRequest = new GenerationRequest(
            SessionId:            session.Id,
            TemplateImageKey:     template.TemplateImageKey,
            Prompt:               template.Prompt ?? template.Name,
            UploadedImageKeys:    uploadedKeysList,
            SubjectSlots:         subjectSlots,
            ExpectedSubjectCount: expectedSubjectCount);

        var result = await imageGenerationProvider.GenerateAsync(genRequest, ct);

        // Log generation
        db.AiGenerationLogs.Add(new AiGenerationLog
        {
            Id                = Guid.NewGuid(),
            PortraitSessionId = session.Id,
            Provider          = imageGenerationProvider.ProviderType,
            Model             = "gemini-2.0-flash-exp",
            Status            = result.Status,
            DurationMs        = result.DurationMs,
            ErrorMessage      = result.ErrorMessage,
            CreatedAt         = DateTime.UtcNow,
        });

        if (!result.Success || result.ImageData is null)
        {
            session.Status    = PortraitSessionStatus.Failed;
            session.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return StatusCode(500, new { message = "Portrait generation failed.", detail = result.ErrorMessage });
        }

        // Burn watermark into image bytes (code only — no AI tokens consumed)
        var watermarkedBytes = watermarkService.Apply(result.ImageData);

        // Save watermarked preview to MinIO
        var previewKey = $"portraits/{session.Id}/preview.jpg";
        await storageService.UploadAsync(previewKey, watermarkedBytes, "image/jpeg", ct);

        session.WatermarkedPreviewKey = previewKey;
        session.Status    = PortraitSessionStatus.PreviewReady;
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        _ = analytics.TrackAsync(AnalyticsEventType.PreviewGenerated,
            session.Id.ToString(),
            new { templateId = req.TemplateId, provider = imageGenerationProvider.ProviderType.ToString() });

        return Ok(new
        {
            sessionId  = session.Id,
            previewKey,
            regenLimit,
        });
    }

    // ── POST /api/portraits/{sessionId}/regenerate ────────────────────────────
    /// <summary>
    /// Re-generates the portrait for an existing session using the already-uploaded
    /// photos. Enforces the admin-configurable regeneration limit.
    /// Returns 429 if the limit is reached or regenerations are disabled.
    /// </summary>
    [HttpPost("{sessionId}/regenerate")]
    [EnableRateLimiting("portraits")]
    public async Task<IActionResult> Regenerate(Guid sessionId, CancellationToken ct)
    {
        var session = await db.PortraitSessions
            .Include(s => s.Template)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        if (session is null)
            return NotFound(new { message = "Session not found." });

        // Check regen enabled setting
        var regenEnabled = await settingsService.GetAsync<bool>("regen.enabled", ct) ?? true;
        if (!regenEnabled)
            return StatusCode(429, new { message = "Regenerations are currently disabled.", regenLeft = 0 });

        // Check regen limit
        var regenLimit = await settingsService.GetAsync<int>("regen.maxPerSession", ct) ?? 5;
        if (session.RegenerationCount >= regenLimit)
            return StatusCode(429, new
            {
                message = $"You have used all {regenLimit} regeneration attempts.",
                regenLeft = 0,
            });

        if (string.IsNullOrWhiteSpace(session.Template?.TemplateImageKey))
            return BadRequest(new { message = "Template has no reference image." });

        // Parse already-uploaded file keys from MinIO
        var uploadedKeys = JsonSerializer.Deserialize<Dictionary<string, string>>(session.UploadedFilesJson)
            ?? new Dictionary<string, string>();

        if (uploadedKeys.Count == 0)
            return BadRequest(new { message = "No uploaded photos found for this session." });

        // Increment count and mark as generating
        session.RegenerationCount++;
        session.Status    = PortraitSessionStatus.Generating;
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Re-run AI generation with the stored photos
        var regenBaseSlots = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        List<SlotDefinition>? regenSlotDefs = null;
        try
        {
            regenSlotDefs = System.Text.Json.JsonSerializer
                .Deserialize<List<SlotDefinition>>(session.Template.UploadSlotsJson ?? "[]");
            if (regenSlotDefs is not null)
                foreach (var sd in regenSlotDefs) regenBaseSlots[sd.name] = sd.type;
        }
        catch { }

        var regenSubjectSlots = uploadedKeys.Keys.Select(slotName =>
        {
            if (regenBaseSlots.TryGetValue(slotName, out var t)) return new SubjectSlot(slotName, t);
            if (slotName.StartsWith("extra_pet", StringComparison.OrdinalIgnoreCase)) return new SubjectSlot(slotName, "pet");
            return new SubjectSlot(slotName, "person");
        }).ToList();

        var regenExpectedCount = regenSlotDefs?.Count ?? regenSubjectSlots.Count;

        var genRequest = new GenerationRequest(
            SessionId:            session.Id,
            TemplateImageKey:     session.Template.TemplateImageKey,
            Prompt:               session.Template.Prompt ?? session.Template.Name,
            UploadedImageKeys:    [.. uploadedKeys.Values],
            SubjectSlots:         regenSubjectSlots,
            ExpectedSubjectCount: regenExpectedCount);

        var result = await imageGenerationProvider.GenerateAsync(genRequest, ct);

        // Log generation
        db.AiGenerationLogs.Add(new AiGenerationLog
        {
            Id                = Guid.NewGuid(),
            PortraitSessionId = session.Id,
            Provider          = imageGenerationProvider.ProviderType,
            Model             = "gemini-2.0-flash-exp",
            Status            = result.Status,
            DurationMs        = result.DurationMs,
            ErrorMessage      = result.ErrorMessage,
            CreatedAt         = DateTime.UtcNow,
        });

        if (!result.Success || result.ImageData is null)
        {
            session.Status    = PortraitSessionStatus.Failed;
            session.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            _ = analytics.TrackAsync(AnalyticsEventType.GenerationFailed, session.Id.ToString(),
                new { error = result.ErrorMessage });
            return StatusCode(500, new { message = "Portrait regeneration failed.", detail = result.ErrorMessage });
        }

        // Overwrite watermarked preview
        var watermarkedBytes = watermarkService.Apply(result.ImageData);
        var previewKey = $"portraits/{session.Id}/preview.jpg";
        await storageService.UploadAsync(previewKey, watermarkedBytes, "image/jpeg", ct);

        session.WatermarkedPreviewKey = previewKey;
        session.Status    = PortraitSessionStatus.PreviewReady;
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        _ = analytics.TrackAsync(AnalyticsEventType.RegenerationUsed, session.Id.ToString(),
            new { regenCount = session.RegenerationCount });

        var regenLeft = regenLimit - session.RegenerationCount;

        return Ok(new
        {
            sessionId  = session.Id,
            previewKey,
            regenLeft,
        });
    }

    // ── PATCH /api/portraits/{sessionId}/email ────────────────────────────────
    /// <summary>
    /// Stores the customer's email address on an existing session.
    /// Called from the frontend while generation is in progress (lead capture).
    /// </summary>
    [HttpPatch("{sessionId}/email")]
    public async Task<IActionResult> SetEmail(Guid sessionId, [FromBody] SetEmailRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@') || req.Email.Length > 254)
            return BadRequest(new { message = "Invalid email address." });

        var session = await db.PortraitSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        if (session is null)
            return NotFound(new { message = "Session not found." });

        session.CustomerEmail = req.Email.Trim();
        session.UpdatedAt     = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { saved = true });
    }

    // ── GET /api/portraits/{sessionId}/info ──────────────────────────────────
    /// <summary>
    /// Public endpoint used by the "resume from email" flow.
    /// Returns just enough info to reload the wizard at the right step.
    /// </summary>
    [HttpGet("{sessionId}/info")]
    public async Task<IActionResult> Info(Guid sessionId, CancellationToken ct)
    {
        var session = await db.PortraitSessions
            .Include(s => s.Template)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        if (session is null) return NotFound();

        return Ok(new
        {
            sessionId  = session.Id,
            status     = session.Status.ToString(),
            hasPreview = session.WatermarkedPreviewKey != null,
            template   = session.Template == null ? null : new
            {
                id   = session.Template.Id,
                slug = session.Template.Slug,
                name = session.Template.Name,
            },
        });
    }

    // ── GET /api/portraits/{sessionId}/preview ────────────────────────────────
    // HEAD is used by the frontend poller to check readiness without downloading bytes.
    /// <summary>Streams the watermarked preview image for the given session.</summary>
    [HttpGet("{sessionId}/preview")]
    [HttpHead("{sessionId}/preview")]
    public async Task<IActionResult> Preview(Guid sessionId, CancellationToken ct)
    {
        var session = await db.PortraitSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        if (session is null || string.IsNullOrEmpty(session.WatermarkedPreviewKey))
            return NotFound(new { message = "Preview not found." });

        // HEAD: just confirm the resource exists — skip the download
        if (HttpContext.Request.Method == HttpMethods.Head)
        {
            Response.Headers.ContentType   = "image/jpeg";
            Response.Headers.CacheControl  = "no-cache, no-store";
            return Ok();
        }

        try
        {
            var bytes = await storageService.DownloadAsync(session.WatermarkedPreviewKey, ct);
            Response.Headers.CacheControl = "private, max-age=3600";
            return File(bytes, "image/jpeg");
        }
        catch
        {
            return NotFound();
        }
    }
}

public record StartPortraitRequest(string TemplateId, string? CustomerEmail = null, string? Source = null);
public record SetEmailRequest(string Email);

// Used to parse template.UploadSlotsJson
internal record SlotDefinition(string name, string label, string type, bool required);
