using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/reviews")]
[Authorize(Roles = "Admin")]
public class AdminReviewsController(IApplicationDbContext db, IStorageService storageService) : ControllerBase
{
    private const string StoragePrefix = "reviews";

    // ── GET /api/admin/reviews ────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var reviews = await db.Reviews
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return Ok(reviews.Select(MapToDto));
    }

    // ── POST /api/admin/reviews ───────────────────────────────────────────────
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> Create(
        [FromForm] ReviewFormRequest req,
        IFormFile? profilePhoto,
        IFormFile? media,
        CancellationToken ct)
    {
        var review = new Review
        {
            Name      = req.Name ?? "",
            Location  = req.Location ?? "",
            Subject   = req.Subject ?? "",
            Rating    = req.Rating,
            Text      = req.Text ?? "",
            Product   = req.Product,
            IsVisible = req.IsVisible,
            CreatedAt = DateTime.UtcNow,
        };

        if (profilePhoto is { Length: > 0 })
            review.ProfilePhotoKey = await UploadFileAsync(profilePhoto, "profile", ct);

        if (media is { Length: > 0 })
            review.MediaKey = await UploadFileAsync(media, "media", ct);

        db.Reviews.Add(review);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new { }, MapToDto(review));
    }

    // ── PUT /api/admin/reviews/{id} ───────────────────────────────────────────
    [HttpPut("{id:int}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> Update(
        int id,
        [FromForm] ReviewFormRequest req,
        IFormFile? profilePhoto,
        IFormFile? media,
        CancellationToken ct)
    {
        var review = await db.Reviews.FindAsync([id], ct);
        if (review is null) return NotFound();

        review.Name      = req.Name ?? review.Name;
        review.Location  = req.Location ?? review.Location;
        review.Subject   = req.Subject ?? review.Subject;
        review.Rating    = req.Rating;
        review.Text      = req.Text ?? review.Text;
        review.Product   = req.Product;
        review.IsVisible = req.IsVisible;

        if (profilePhoto is { Length: > 0 })
        {
            if (review.ProfilePhotoKey != null)
                await TryDeleteAsync(review.ProfilePhotoKey, ct);
            review.ProfilePhotoKey = await UploadFileAsync(profilePhoto, "profile", ct);
        }

        if (media is { Length: > 0 })
        {
            if (review.MediaKey != null)
                await TryDeleteAsync(review.MediaKey, ct);
            review.MediaKey = await UploadFileAsync(media, "media", ct);
        }

        await db.SaveChangesAsync(ct);
        return Ok(MapToDto(review));
    }

    // ── DELETE /api/admin/reviews/{id} ────────────────────────────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var review = await db.Reviews.FindAsync([id], ct);
        if (review is null) return NotFound();

        if (review.ProfilePhotoKey != null) await TryDeleteAsync(review.ProfilePhotoKey, ct);
        if (review.MediaKey != null)        await TryDeleteAsync(review.MediaKey, ct);

        db.Reviews.Remove(review);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<string> UploadFileAsync(IFormFile file, string folder, CancellationToken ct)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var key = $"{StoragePrefix}/{folder}/{Guid.NewGuid()}{ext}";
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var contentType = file.ContentType.Length > 0 ? file.ContentType : "application/octet-stream";
        await storageService.UploadAsync(key, ms.ToArray(), contentType, ct);
        return key;
    }

    private async Task TryDeleteAsync(string key, CancellationToken ct)
    {
        try { await storageService.DeleteAsync(key, ct); } catch { /* best-effort */ }
    }

    private static ReviewDto MapToDto(Review r) => new(
        r.Id,
        r.Name,
        r.Location,
        r.ProfilePhotoKey,
        r.Subject,
        r.Rating,
        r.Text,
        r.Product,
        r.MediaKey,
        r.IsVisible,
        r.CreatedAt
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record ReviewFormRequest(
    string? Name,
    string? Location,
    string? Subject,
    int Rating,
    string? Text,
    string? Product,
    bool IsVisible
);

public record ReviewDto(
    int Id,
    string Name,
    string Location,
    string? ProfilePhotoKey,
    string Subject,
    int Rating,
    string Text,
    string? Product,
    string? MediaKey,
    bool IsVisible,
    DateTime CreatedAt
);
