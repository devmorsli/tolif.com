using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers;

/// <summary>
/// Public endpoint — returns active products and their active variants.
/// Used by the storefront wizard to show live pricing.
/// </summary>
[ApiController]
[Route("api/products")]
public class ProductsController(IApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var products = await db.Products
            .Where(p => p.IsActive)
            .Include(p => p.Variants.Where(v => v.IsActive).OrderBy(v => v.Price))
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);

        var result = products.Select(p => new
        {
            id       = p.Id,
            name     = p.Name,
            type     = p.Type.ToString().ToLower(),
            variants = p.Variants.Select(v => new
            {
                id       = v.Id,
                size     = v.Size,
                price    = v.Price,
                currency = v.Currency,
            }),
        });

        return Ok(result);
    }
}
