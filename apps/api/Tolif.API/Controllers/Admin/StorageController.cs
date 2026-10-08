using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/storage")]
[Authorize(Roles = "Admin")]
public class StorageController(IStorageService storageService) : ControllerBase
{
    // ── GET /api/storage/preview?key=... ──────────────────────────────────────
    /// <summary>
    /// Streams the file bytes directly from MinIO/S3 to the browser.
    /// Avoids redirecting to the internal Docker hostname (minio:9000) which
    /// is not reachable from the user's browser.
    /// This endpoint is public (AllowAnonymous) so customer-facing template
    /// images load without requiring admin login.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("preview")]
    public async Task<IActionResult> Preview([FromQuery] string key, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(key))
            return BadRequest(new { message = "key is required." });

        try
        {
            var bytes = await storageService.DownloadAsync(key, ct);
            var ext = Path.GetExtension(key).ToLowerInvariant();
            var contentType = ext switch
            {
                ".png"  => "image/png",
                ".webp" => "image/webp",
                ".gif"  => "image/gif",
                _       => "image/jpeg"
            };
            Response.Headers.CacheControl = "public, max-age=3600";
            return File(bytes, contentType);
        }
        catch
        {
            return NotFound();
        }
    }
}
