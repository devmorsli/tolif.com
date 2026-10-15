using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/storage")]
[Authorize(Roles = "Admin")]
public class StorageController(IStorageService storageService, IMemoryCache cache) : ControllerBase
{
    // ── GET /api/storage/preview?key=... ──────────────────────────────────────
    /// <summary>
    /// Streams the file bytes directly from MinIO/S3 to the browser.
    /// Results are cached in server memory for 30 minutes so repeated page
    /// loads serve template images from RAM instead of downloading from storage
    /// on every request. Avoids redirecting to the internal Docker hostname
    /// (minio:9000) which is not reachable from the user's browser.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("preview")]
    public async Task<IActionResult> Preview([FromQuery] string key, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(key))
            return BadRequest(new { message = "key is required." });

        var cacheKey = $"storage:preview:{key}";

        if (!cache.TryGetValue(cacheKey, out (byte[] Bytes, string ContentType) cached))
        {
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
                cached = (bytes, contentType);
                cache.Set(cacheKey, cached, TimeSpan.FromMinutes(30));
            }
            catch
            {
                return NotFound();
            }
        }

        Response.Headers.CacheControl = "public, max-age=3600";
        return File(cached.Bytes, cached.ContentType);
    }
}
