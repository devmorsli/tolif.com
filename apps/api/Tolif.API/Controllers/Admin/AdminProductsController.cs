using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/products")]
[Authorize(Roles = "Admin")]
public class AdminProductsController(IApplicationDbContext db) : ControllerBase
{
    // ── GET /api/admin/products ───────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var products = await db.Products
            .Include(p => p.Variants.OrderBy(v => v.Price))
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);

        return Ok(products.Select(Map));
    }

    // ── PUT /api/admin/products/{id}/toggle ───────────────────────────────────
    [HttpPut("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken ct)
    {
        var product = await db.Products.FindAsync([id], ct);
        if (product is null) return NotFound();

        product.IsActive  = !product.IsActive;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(Map(product));
    }

    // ── PUT /api/admin/products/variants/{id} ─────────────────────────────────
    /// <summary>Update a variant's price and/or currency.</summary>
    [HttpPut("variants/{id:guid}")]
    public async Task<IActionResult> UpdateVariant(Guid id, [FromBody] UpdateVariantRequest req, CancellationToken ct)
    {
        var variant = await db.ProductVariants
            .Include(v => v.Product)
            .FirstOrDefaultAsync(v => v.Id == id, ct);

        if (variant is null) return NotFound();

        if (req.Price <= 0)
            return BadRequest(new { message = "Price must be greater than 0." });

        variant.Price     = req.Price;
        variant.Currency  = req.Currency.ToUpperInvariant();
        variant.IsActive  = req.IsActive;
        variant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(MapVariant(variant));
    }

    // ── POST /api/admin/products/{id}/variants ────────────────────────────────
    [HttpPost("{id:guid}/variants")]
    public async Task<IActionResult> AddVariant(Guid id, [FromBody] AddVariantRequest req, CancellationToken ct)
    {
        var product = await db.Products.FindAsync([id], ct);
        if (product is null) return NotFound();

        if (req.Price <= 0)
            return BadRequest(new { message = "Price must be greater than 0." });

        var variant = new ProductVariant
        {
            ProductId = product.Id,
            Size      = req.Size,
            Price     = req.Price,
            Currency  = req.Currency.ToUpperInvariant(),
            IsActive  = true,
        };
        db.ProductVariants.Add(variant);
        await db.SaveChangesAsync(ct);

        return Ok(MapVariant(variant));
    }

    // ── DELETE /api/admin/products/variants/{id} ──────────────────────────────
    [HttpDelete("variants/{id:guid}")]
    public async Task<IActionResult> DeleteVariant(Guid id, CancellationToken ct)
    {
        var variant = await db.ProductVariants.FindAsync([id], ct);
        if (variant is null) return NotFound();

        // Prevent deleting if used in existing orders
        var inUse = await db.OrderItems.AnyAsync(i => i.ProductVariantId == id, ct);
        if (inUse)
            return BadRequest(new { message = "Cannot delete a variant that is used in existing orders. Deactivate it instead." });

        db.ProductVariants.Remove(variant);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static object Map(Product p) => new
    {
        id       = p.Id,
        name     = p.Name,
        type     = p.Type.ToString().ToLower(),
        isActive = p.IsActive,
        sortOrder = p.SortOrder,
        variants = p.Variants.Select(MapVariant),
    };

    private static object MapVariant(ProductVariant v) => new
    {
        id       = v.Id,
        size     = v.Size,
        price    = v.Price,
        currency = v.Currency,
        isActive = v.IsActive,
        printfulVariantId = v.PrintfulVariantId,
        printifyVariantId = v.PrintifyVariantId,
    };
}

public record UpdateVariantRequest(decimal Price, string Currency, bool IsActive);
public record AddVariantRequest(string Size, decimal Price, string Currency);
