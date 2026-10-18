using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/printful")]
[Authorize]
public class AdminPrintfulController(
    IPrintfulService printful,
    ISettingsService settings,
    IApplicationDbContext db) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented        = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    // ── Test connection ────────────────────────────────────────────────────────

    [HttpGet("connection")]
    public async Task<IActionResult> TestConnection(CancellationToken ct)
    {
        var error = await printful.TestConnectionAsync(ct);
        return Ok(new { connected = error is null, error });
    }

    // ── Catalog ────────────────────────────────────────────────────────────────

    /// <summary>List all Printful product categories.</summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var categories = await printful.GetCategoriesAsync(ct);
        return Ok(categories);
    }

    /// <summary>Return the last-synced catalog (stored as JSON in Settings).</summary>
    [HttpGet("catalog")]
    public async Task<IActionResult> GetCatalog(CancellationToken ct)
    {
        var json = await settings.GetAsync("printful.catalog_cache", ct);
        if (json is null) return Ok(new { products = Array.Empty<object>(), syncedAt = (string?)null });

        try
        {
            var doc = JsonDocument.Parse(json);
            return Ok(doc.RootElement);
        }
        catch
        {
            return Ok(new { products = Array.Empty<object>(), syncedAt = (string?)null });
        }
    }

    /// <summary>Pull fresh data from Printful API and cache it.</summary>
    [HttpPost("catalog/sync")]
    public async Task<IActionResult> SyncCatalog(CancellationToken ct)
    {
        var products = await printful.SyncCatalogAsync(ct);

        var payload = new
        {
            products,
            syncedAt = DateTime.UtcNow.ToString("O"),
        };
        await settings.SetAsync(
            "printful.catalog_cache",
            JsonSerializer.Serialize(payload, JsonOpts),
            isSensitive: false,
            ct: ct);

        return Ok(payload);
    }

    /// <summary>Sync products from a specific category and merge into the catalog cache.</summary>
    [HttpPost("catalog/sync/category/{categoryId:long}")]
    public async Task<IActionResult> SyncByCategory(long categoryId, CancellationToken ct)
    {
        var newProducts = await printful.SyncCategoryAsync(categoryId, ct);

        // Merge into existing cache (replace by productId, keep everything else)
        var existingJson = await settings.GetAsync("printful.catalog_cache", ct);
        var existing = new List<object>();
        string? syncedAt = null;

        if (existingJson is not null)
        {
            try
            {
                var doc = JsonDocument.Parse(existingJson);
                syncedAt = doc.RootElement.TryGetProperty("syncedAt", out var sat) ? sat.GetString() : null;
                if (doc.RootElement.TryGetProperty("products", out var prods))
                    existing = JsonSerializer.Deserialize<List<object>>(prods.GetRawText(), JsonOpts) ?? [];
            }
            catch { /* start fresh */ }
        }

        // Re-serialize existing products to get their IDs, then merge
        var newIds = new HashSet<long>(newProducts.Select(p => p.ProductId));
        var merged = existing
            .Select(p => JsonSerializer.Deserialize<System.Text.Json.JsonElement>(
                JsonSerializer.Serialize(p, JsonOpts), JsonOpts))
            .Where(p => {
                if (p.TryGetProperty("productId", out var id)) return !newIds.Contains(id.GetInt64());
                return true;
            })
            .Cast<object>()
            .Concat(newProducts.Cast<object>())
            .ToList();

        var payload = new { products = merged, syncedAt = DateTime.UtcNow.ToString("O") };
        await settings.SetAsync(
            "printful.catalog_cache",
            JsonSerializer.Serialize(payload, JsonOpts),
            isSensitive: false,
            ct: ct);

        return Ok(new { added = newProducts.Count, total = merged.Count, syncedAt = payload.syncedAt });
    }

    /// <summary>Fetch variants for a single Printful catalog product (called lazily on expand).</summary>
    [HttpGet("catalog/{productId:long}/variants")]
    public async Task<IActionResult> GetProductVariants(long productId, CancellationToken ct)
    {
        var variants = await printful.GetProductVariantsAsync(productId, ct);
        return Ok(variants);
    }

    // ── Product mappings ───────────────────────────────────────────────────────

    /// <summary>
    /// Mappings are stored as JSON: [ { "ourProductId": "poster-black-18x24", "printfulVariantId": "12345" } ]
    /// </summary>
    [HttpGet("mappings")]
    public async Task<IActionResult> GetMappings(CancellationToken ct)
    {
        var json = await settings.GetAsync("printful.mappings", ct);
        if (json is null) return Ok(Array.Empty<object>());

        try
        {
            return Ok(JsonDocument.Parse(json).RootElement);
        }
        catch
        {
            return Ok(Array.Empty<object>());
        }
    }

    [HttpPost("mappings")]
    public async Task<IActionResult> SaveMappings([FromBody] JsonElement mappings, CancellationToken ct)
    {
        await settings.SetAsync(
            "printful.mappings",
            mappings.GetRawText(),
            isSensitive: false,
            ct: ct);
        return Ok();
    }

    // ── Webhooks ───────────────────────────────────────────────────────────────

    [HttpGet("webhooks")]
    public async Task<IActionResult> GetWebhooks(CancellationToken ct)
    {
        var hooks = await printful.GetWebhooksAsync(ct);
        return Ok(hooks);
    }

    [HttpPost("webhooks/register")]
    public async Task<IActionResult> RegisterWebhooks([FromBody] RegisterWebhooksRequest req, CancellationToken ct)
    {
        try
        {
            await printful.RegisterWebhooksAsync(req.BaseUrl, ct);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var hooks = await printful.GetWebhooksAsync(ct);
        return Ok(hooks);
    }

    public record RegisterWebhooksRequest(string BaseUrl);

    // ── Variant mappings (writes directly to ProductVariant entity) ────────────

    /// <summary>
    /// Set the Printful variant ID directly on a ProductVariant entity.
    /// This is what SubmitPrintOrderJob reads when submitting to Printful.
    /// </summary>
    [HttpPost("set-variant-id")]
    public async Task<IActionResult> SetVariantId([FromBody] SetVariantIdRequest req, CancellationToken ct)
    {
        var variant = await db.ProductVariants.FindAsync([req.ProductVariantId], ct);
        if (variant is null) return NotFound();
        variant.PrintfulVariantId = string.IsNullOrWhiteSpace(req.PrintfulVariantId) ? null : req.PrintfulVariantId.Trim();
        variant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new { variant.Id, variant.PrintfulVariantId });
    }

    /// <summary>
    /// Return all ProductVariants with their current PrintfulVariantId so the
    /// mapping UI can show which are already mapped.
    /// </summary>
    [HttpGet("variant-mappings")]
    public async Task<IActionResult> GetVariantMappings(CancellationToken ct)
    {
        var variants = await db.ProductVariants
            .Include(v => v.Product)
            .Where(v => v.IsActive)
            .OrderBy(v => v.Product.Name)
            .ThenBy(v => v.Size)
            .Select(v => new
            {
                v.Id,
                v.Size,
                v.Price,
                v.Currency,
                v.PrintfulVariantId,
                productName = v.Product.Name,
                productType = v.Product.Type.ToString(),
            })
            .ToListAsync(ct);
        return Ok(variants);
    }

    public record SetVariantIdRequest(Guid ProductVariantId, string? PrintfulVariantId);
}
