using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers;

/// <summary>
/// Public (no-auth) endpoint for the digital storefront.
/// Returns only active products and tiers — never file storage keys.
/// </summary>
[ApiController]
[Route("api/digital-products")]
public class DigitalProductsController(IApplicationDbContext db) : ControllerBase
{
    // ── GET /api/digital-products ─────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var products = await db.DigitalProducts
            .Where(p => p.IsActive)
            .Include(p => p.Tiers.Where(t => t.IsActive).OrderBy(t => t.SortOrder))
                .ThenInclude(t => t.Files.OrderBy(f => f.SortOrder))
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

        return Ok(products.Select(p => new
        {
            p.Id, p.Name, p.Slug, p.Tagline, p.Description, p.HeroImageKey, p.FeaturesJson,
            tiers = p.Tiers.Select(t => new
            {
                t.Id, t.TierName, t.DisplayName, t.Price, t.Currency, t.FeaturesJson,
                fileCount = t.Files.Count,
            }),
        }));
    }

    // ── GET /api/digital-products/{slug} ──────────────────────────────────────
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var product = await db.DigitalProducts
            .Where(p => p.IsActive && p.Slug == slug)
            .Include(p => p.Tiers.Where(t => t.IsActive).OrderBy(t => t.SortOrder))
                .ThenInclude(t => t.Files.OrderBy(f => f.SortOrder))
            .FirstOrDefaultAsync(ct);

        if (product is null) return NotFound();

        return Ok(new
        {
            product.Id, product.Name, product.Slug, product.Tagline,
            product.Description, product.HeroImageKey, product.FeaturesJson,
            tiers = product.Tiers.Select(t => new
            {
                t.Id, t.TierName, t.DisplayName, t.Price, t.Currency, t.FeaturesJson,
                fileCount = t.Files.Count,
            }),
        });
    }
}
