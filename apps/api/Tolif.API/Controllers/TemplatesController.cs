using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/templates")]
public class TemplatesController(IApplicationDbContext db) : ControllerBase
{
    // ── GET /api/templates ────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var templates = await db.Templates
            .Where(t => t.IsActive)
            .OrderBy(t => t.SortOrder)
            .Select(t => new PublicTemplateDto(
                t.Id.ToString(),
                t.Slug,
                t.Name,
                t.Category,
                t.Style ?? "",
                t.Description ?? "",
                t.TemplateImageKey,
                t.UploadSlotsJson,
                t.SeoTitle ?? "",
                t.SeoDescription ?? ""))
            .ToListAsync(ct);

        return Ok(templates);
    }

    // ── GET /api/templates/{slug} ─────────────────────────────────────────────
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var t = await db.Templates
            .Where(t => t.IsActive && t.Slug == slug)
            .FirstOrDefaultAsync(ct);

        if (t is null) return NotFound();

        return Ok(new PublicTemplateDto(
            t.Id.ToString(),
            t.Slug,
            t.Name,
            t.Category,
            t.Style ?? "",
            t.Description ?? "",
            t.TemplateImageKey,
            t.UploadSlotsJson,
            t.SeoTitle ?? "",
            t.SeoDescription ?? ""));
    }
}

public record PublicTemplateDto(
    string Id,
    string Slug,
    string Name,
    string Category,
    string Style,
    string Description,
    string TemplateImageKey,
    string UploadSlotsJson,
    string SeoTitle,
    string SeoDescription
);
