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
    /// Proxies a file from MinIO/S3 to the browser and caches the bytes in
    /// server memory for 30 minutes. Template images are already stored as
    /// optimised WebP (resized at upload time), so no processing is done here.
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
                    ".webp" => "image/webp",
                    ".png"  => "image/png",
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
