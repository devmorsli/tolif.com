using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/digital-products")]
[Authorize(Roles = "Admin")]
public class AdminDigitalProductsController(
    IApplicationDbContext db,
    IStorageService storage) : ControllerBase
{
    // ── GET /api/admin/digital-products ──────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var products = await db.DigitalProducts
            .Include(p => p.Tiers.OrderBy(t => t.SortOrder))
                .ThenInclude(t => t.Files.OrderBy(f => f.SortOrder))
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

        return Ok(products.Select(MapProduct));
    }

    // ── GET /api/admin/digital-products/{id} ─────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var product = await db.DigitalProducts
            .Include(p => p.Tiers.OrderBy(t => t.SortOrder))
                .ThenInclude(t => t.Files.OrderBy(f => f.SortOrder))
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (product is null) return NotFound();
        return Ok(MapProduct(product));
    }

    // ── POST /api/admin/digital-products ─────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DigitalProductRequest req, CancellationToken ct)
    {
        var slug = req.Slug ?? req.Name.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("_", "-");

        var product = new DigitalProduct
        {
            Name         = req.Name,
            Slug         = slug,
            Tagline      = req.Tagline ?? "",
            Description  = req.Description ?? "",
            HeroImageKey = req.HeroImageKey,
            FeaturesJson = req.FeaturesJson ?? "[]",
            IsActive     = req.IsActive,
            SortOrder    = req.SortOrder,
        };

        db.DigitalProducts.Add(product);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, MapProduct(product));
    }

    // ── PUT /api/admin/digital-products/{id} ─────────────────────────────────
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] DigitalProductRequest req, CancellationToken ct)
    {
        var product = await db.DigitalProducts.FindAsync([id], ct);
        if (product is null) return NotFound();

        product.Name         = req.Name;
        product.Slug         = req.Slug ?? product.Slug;
        product.Tagline      = req.Tagline ?? "";
        product.Description  = req.Description ?? "";
        product.HeroImageKey = req.HeroImageKey;
        product.FeaturesJson = req.FeaturesJson ?? "[]";
        product.IsActive     = req.IsActive;
        product.SortOrder    = req.SortOrder;

        await db.SaveChangesAsync(ct);
        return Ok(MapProduct(product));
    }

    // ── DELETE /api/admin/digital-products/{id} ───────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var product = await db.DigitalProducts
            .Include(p => p.Tiers)
                .ThenInclude(t => t.Files)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (product is null) return NotFound();

        // Delete all storage files
        foreach (var tier in product.Tiers)
            foreach (var file in tier.Files)
                await storage.DeleteAsync(file.StorageKey, ct).ConfigureAwait(false);

        if (!string.IsNullOrEmpty(product.HeroImageKey))
            await storage.DeleteAsync(product.HeroImageKey, ct).ConfigureAwait(false);

        db.DigitalProducts.Remove(product);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── POST /api/admin/digital-products/{id}/tiers ───────────────────────────
    [HttpPost("{id:guid}/tiers")]
    public async Task<IActionResult> CreateTier(Guid id, [FromBody] DigitalTierRequest req, CancellationToken ct)
    {
        var product = await db.DigitalProducts.FindAsync([id], ct);
        if (product is null) return NotFound();

        var tier = new DigitalProductTier
        {
            DigitalProductId = id,
            TierName         = req.TierName,
            DisplayName      = req.DisplayName,
            Price            = req.Price,
            Currency         = req.Currency ?? "EUR",
            FeaturesJson     = req.FeaturesJson ?? "[]",
            StripePriceId    = req.StripePriceId,
            IsActive         = req.IsActive,
            SortOrder        = req.SortOrder,
        };

        db.DigitalProductTiers.Add(tier);
        await db.SaveChangesAsync(ct);
        return Ok(MapTier(tier));
    }

    // ── PUT /api/admin/digital-products/tiers/{tierId} ───────────────────────
    [HttpPut("tiers/{tierId:guid}")]
    public async Task<IActionResult> UpdateTier(Guid tierId, [FromBody] DigitalTierRequest req, CancellationToken ct)
    {
        var tier = await db.DigitalProductTiers.FindAsync([tierId], ct);
        if (tier is null) return NotFound();

        tier.TierName      = req.TierName;
        tier.DisplayName   = req.DisplayName;
        tier.Price         = req.Price;
        tier.Currency      = req.Currency ?? tier.Currency;
        tier.FeaturesJson  = req.FeaturesJson ?? "[]";
        tier.StripePriceId = req.StripePriceId;
        tier.IsActive      = req.IsActive;
        tier.SortOrder     = req.SortOrder;

        await db.SaveChangesAsync(ct);
        return Ok(MapTier(tier));
    }

    // ── DELETE /api/admin/digital-products/tiers/{tierId} ────────────────────
    [HttpDelete("tiers/{tierId:guid}")]
    public async Task<IActionResult> DeleteTier(Guid tierId, CancellationToken ct)
    {
        var tier = await db.DigitalProductTiers
            .Include(t => t.Files)
            .FirstOrDefaultAsync(t => t.Id == tierId, ct);

        if (tier is null) return NotFound();

        foreach (var file in tier.Files)
            await storage.DeleteAsync(file.StorageKey, ct).ConfigureAwait(false);

        db.DigitalProductTiers.Remove(tier);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── POST /api/admin/digital-products/tiers/{tierId}/files ────────────────
    [HttpPost("tiers/{tierId:guid}/files")]
    [RequestSizeLimit(200_000_000)] // 200 MB
    public async Task<IActionResult> UploadFile(Guid tierId, IFormFile file, CancellationToken ct)
    {
        var tier = await db.DigitalProductTiers
            .Include(t => t.DigitalProduct)
            .FirstOrDefaultAsync(t => t.Id == tierId, ct);

        if (tier is null) return NotFound();
        if (file is null || file.Length == 0) return BadRequest(new { message = "No file provided." });

        var ext = Path.GetExtension(file.FileName);
        var key = $"digital/{tier.DigitalProductId}/{tierId}/{Guid.NewGuid():N}{ext}";

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        await storage.UploadAsync(key, ms.ToArray(), file.ContentType, ct);

        var digitalFile = new DigitalFile
        {
            DigitalProductTierId = tierId,
            FileName             = file.FileName,
            StorageKey           = key,
            FileSizeBytes        = file.Length,
            ContentType          = file.ContentType,
            SortOrder            = 0,
        };

        db.DigitalFiles.Add(digitalFile);
        await db.SaveChangesAsync(ct);

        return Ok(MapFile(digitalFile));
    }

    // ── DELETE /api/admin/digital-products/files/{fileId} ────────────────────
    [HttpDelete("files/{fileId:guid}")]
    public async Task<IActionResult> DeleteFile(Guid fileId, CancellationToken ct)
    {
        var file = await db.DigitalFiles.FindAsync([fileId], ct);
        if (file is null) return NotFound();

        await storage.DeleteAsync(file.StorageKey, ct);
        db.DigitalFiles.Remove(file);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── POST /api/admin/digital-products/upload-image ────────────────────────
    [HttpPost("upload-image")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "No file provided." });

        var ext = Path.GetExtension(file.FileName);
        var key = $"digital/images/{Guid.NewGuid():N}{ext}";

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        await storage.UploadAsync(key, ms.ToArray(), file.ContentType, ct);

        var apiBase = HttpContext.Request.Scheme + "://" + HttpContext.Request.Host;
        var url = $"{apiBase}/api/storage/preview?key={Uri.EscapeDataString(key)}";

        return Ok(new { key, url });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static object MapProduct(DigitalProduct p) => new
    {
        p.Id, p.Name, p.Slug, p.Tagline, p.Description,
        p.HeroImageKey, p.FeaturesJson, p.IsActive, p.SortOrder,
        p.CreatedAt, p.UpdatedAt,
        tiers = p.Tiers.Select(MapTier),
    };

    private static object MapTier(DigitalProductTier t) => new
    {
        t.Id, t.DigitalProductId, t.TierName, t.DisplayName,
        t.Price, t.Currency, t.FeaturesJson, t.StripePriceId,
        t.IsActive, t.SortOrder, t.CreatedAt, t.UpdatedAt,
        files = t.Files?.Select(MapFile) ?? [],
    };

    private static object MapFile(DigitalFile f) => new
    {
        f.Id, f.DigitalProductTierId, f.FileName, f.StorageKey,
        f.FileSizeBytes, f.ContentType, f.SortOrder,
    };
}

public record DigitalProductRequest(
    string Name,
    string? Slug,
    string? Tagline,
    string? Description,
    string? HeroImageKey,
    string? FeaturesJson,
    bool IsActive,
    int SortOrder
);

public record DigitalTierRequest(
    string TierName,
    string DisplayName,
    decimal Price,
    string? Currency,
    string? FeaturesJson,
    string? StripePriceId,
    bool IsActive,
    int SortOrder
);
