using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController(IApplicationDbContext db) : ControllerBase
{
    // ── GET /api/reviews ──────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetVisible(CancellationToken ct)
    {
        var reviews = await db.Reviews
            .Where(r => r.IsVisible)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        var dtos = reviews.Select(r => MapToDto(r));
        return Ok(dtos);
    }

    private PublicReviewDto MapToDto(Review r) => new(
        r.Id,
        r.Name,
        r.Location,
        r.ProfilePhotoKey != null ? StoragePreviewUrl(r.ProfilePhotoKey) : null,
        r.Subject,
        r.Rating,
        r.Text,
        r.Product,
        r.MediaKey != null ? StoragePreviewUrl(r.MediaKey) : null
    );

    private string StoragePreviewUrl(string key)
    {
        var requestBase = $"{Request.Scheme}://{Request.Host}";
        return $"{requestBase}/api/storage/preview?key={Uri.EscapeDataString(key)}";
    }
}

public record PublicReviewDto(
    int Id,
    string Name,
    string Location,
    string? ProfilePhotoUrl,
    string Subject,
    int Rating,
    string Text,
    string? Product,
    string? MediaUrl
);
