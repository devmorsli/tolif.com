using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/templates")]
[Authorize(Roles = "Admin")]
public class AdminTemplatesController(IApplicationDbContext db) : ControllerBase
{
    // ── GET /api/admin/templates ──────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var templates = await db.Templates
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .Select(t => MapToDto(t))
            .ToListAsync(ct);

        return Ok(templates);
    }

    // ── GET /api/admin/templates/{id} ─────────────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var template = await db.Templates.FindAsync([id], ct);
        if (template is null)
            return NotFound();

        return Ok(MapToDto(template));
    }

    // ── POST /api/admin/templates ─────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TemplateDto req, CancellationToken ct)
    {
        var template = new Template
        {
            Slug             = req.Slug,
            Name             = req.Name,
            Category         = req.Category,
            Style            = req.Style,
            TemplateImageKey = req.TemplateImageKey,
            Prompt           = req.Prompt,
            UploadSlotsJson  = req.UploadSlotsJson ?? "[]",
            AiProviderOverride = ParseProvider(req.AiProviderOverride),
            IsActive         = req.IsActive,
            SortOrder        = req.SortOrder,
            SeoTitle         = req.SeoTitle,
            SeoDescription   = req.SeoDescription,
            Description      = req.Description
        };

        var slugExists = await db.Templates.AnyAsync(t => t.Slug == req.Slug, ct);
        if (slugExists)
            return Conflict(new { error = $"A template with slug '{req.Slug}' already exists. Use a different slug." });

        db.Templates.Add(template);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = template.Id }, MapToDto(template));
    }

    // ── PUT /api/admin/templates/{id} ─────────────────────────────────────────
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] TemplateDto req, CancellationToken ct)
    {
        var template = await db.Templates.FindAsync([id], ct);
        if (template is null)
            return NotFound();

        if (template.Slug != req.Slug)
        {
            var slugTaken = await db.Templates.AnyAsync(t => t.Slug == req.Slug && t.Id != id, ct);
            if (slugTaken)
                return Conflict(new { error = $"A template with slug '{req.Slug}' already exists. Use a different slug." });
        }

        template.Slug              = req.Slug;
        template.Name              = req.Name;
        template.Category          = req.Category;
        template.Style             = req.Style;
        template.TemplateImageKey  = req.TemplateImageKey;
        template.Prompt            = req.Prompt;
        template.UploadSlotsJson   = req.UploadSlotsJson ?? "[]";
        template.AiProviderOverride = ParseProvider(req.AiProviderOverride);
        template.IsActive          = req.IsActive;
        template.SortOrder         = req.SortOrder;
        template.SeoTitle          = req.SeoTitle;
        template.SeoDescription    = req.SeoDescription;
        template.Description       = req.Description;
        template.UpdatedAt         = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(MapToDto(template));
    }

    // ── DELETE /api/admin/templates/{id} ──────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromBody] DeleteTemplateRequest? req, CancellationToken ct)
    {
        var template = await db.Templates.FindAsync([id], ct);
        if (template is null)
            return NotFound();

        if (req?.Hard == true)
        {
            db.Templates.Remove(template);
        }
        else
        {
            // Soft delete — deactivate
            template.IsActive  = false;
            template.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── PATCH /api/admin/templates/{id}/toggle-active ─────────────────────────
    [HttpPatch("{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id, CancellationToken ct)
    {
        var template = await db.Templates.FindAsync([id], ct);
        if (template is null)
            return NotFound();

        template.IsActive  = !template.IsActive;
        template.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { id = template.Id, isActive = template.IsActive });
    }

    // ── Mapping helper ────────────────────────────────────────────────────────
    private static TemplateResponseDto MapToDto(Template t) => new(
        t.Id,
        t.Slug,
        t.Name,
        t.Category,
        t.Style,
        t.TemplateImageKey,
        t.Prompt,
        t.UploadSlotsJson,
        t.AiProviderOverride.HasValue ? (int?)t.AiProviderOverride.Value : null,
        t.IsActive,
        t.SortOrder,
        t.SeoTitle,
        t.SeoDescription,
        t.Description,
        t.CreatedAt,
        t.UpdatedAt
    );

    private static AiProvider? ParseProvider(string? value) => value?.ToLowerInvariant() switch
    {
        "gemini" => AiProvider.Gemini,
        "falai"  => AiProvider.FalAi,
        "openai" => AiProvider.OpenAi,
        _        => null
    };
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record TemplateDto(
    string Slug,
    string Name,
    string Category,
    string? Style,
    string TemplateImageKey,
    string Prompt,
    string? UploadSlotsJson,
    string? AiProviderOverride,
    bool IsActive,
    int SortOrder,
    string? SeoTitle,
    string? SeoDescription,
    string? Description
);

public record TemplateResponseDto(
    Guid Id,
    string Slug,
    string Name,
    string Category,
    string? Style,
    string TemplateImageKey,
    string Prompt,
    string UploadSlotsJson,
    int? AiProviderOverride,
    bool IsActive,
    int SortOrder,
    string? SeoTitle,
    string? SeoDescription,
    string? Description,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record DeleteTemplateRequest(bool Hard = false);
