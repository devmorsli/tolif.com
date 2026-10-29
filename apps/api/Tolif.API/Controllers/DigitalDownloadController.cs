using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/digital-download")]
public class DigitalDownloadController(
    IApplicationDbContext db,
    IStorageService storage,
    ILogger<DigitalDownloadController> logger) : ControllerBase
{
    // ── GET /api/digital-download/order/{stripeSessionId} ────────────────────
    /// <summary>
    /// Called by the thank-you page to list all downloadable files for a paid order.
    /// Identified by the Stripe Checkout session ID returned in the URL.
    /// </summary>
    [HttpGet("order/{stripeSessionId}")]
    public async Task<IActionResult> GetOrderDownloads(string stripeSessionId, CancellationToken ct)
    {
        var order = await db.DigitalOrders
            .Include(o => o.DigitalProduct)
            .Include(o => o.DigitalProductTier)
                .ThenInclude(t => t!.Files.OrderBy(f => f.SortOrder))
            .Include(o => o.DownloadTokens)
                .ThenInclude(dt => dt.DigitalFile)
            .FirstOrDefaultAsync(o => o.StripeSessionId == stripeSessionId && o.Status == "paid", ct);

        if (order is null)
            return NotFound(new { message = "Order not found or not yet paid." });

        var files = order.DownloadTokens
            .Where(dt => dt.DigitalFile is not null)
            .OrderBy(dt => dt.DigitalFile!.SortOrder)
            .Select(dt => new
            {
                tokenId      = dt.Id,
                token        = dt.Token,
                fileName     = dt.DigitalFile!.FileName,
                fileSizeBytes = dt.DigitalFile.FileSizeBytes,
                contentType  = dt.DigitalFile.ContentType,
                expiresAt    = dt.ExpiresAt,
                downloadsLeft = Math.Max(0, dt.MaxDownloads - dt.DownloadCount),
            })
            .ToList();

        return Ok(new
        {
            orderId         = order.Id,
            productName     = order.DigitalProduct?.Name,
            tierDisplayName = order.TierDisplayName,
            customerEmail   = order.CustomerEmail,
            files,
        });
    }

    // ── GET /api/digital-download/file/{token} ────────────────────────────────
    /// <summary>
    /// Validates the token, increments the download counter, and redirects to
    /// a short-lived presigned S3 URL.
    /// </summary>
    [HttpGet("file/{token}")]
    public async Task<IActionResult> DownloadFile(string token, CancellationToken ct)
    {
        var downloadToken = await db.DigitalDownloadTokens
            .Include(dt => dt.DigitalFile)
            .FirstOrDefaultAsync(dt => dt.Token == token, ct);

        if (downloadToken is null)
            return NotFound(new { message = "Download link not found." });

        if (downloadToken.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "This download link has expired." });

        if (downloadToken.DownloadCount >= downloadToken.MaxDownloads)
            return BadRequest(new { message = "Maximum download limit reached for this link." });

        downloadToken.DownloadCount++;
        await db.SaveChangesAsync(ct);

        try
        {
            var presignedUrl = await storage.GenerateDownloadUrlAsync(
                downloadToken.DigitalFile!.StorageKey,
                TimeSpan.FromMinutes(30),
                ct);

            logger.LogInformation(
                "Digital file downloaded: token={Token}, file={FileName}, count={Count}",
                token, downloadToken.DigitalFile.FileName, downloadToken.DownloadCount);

            return Redirect(presignedUrl);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate download URL for token {Token}", token);
            return StatusCode(500, new { message = "Could not generate download link." });
        }
    }
}
