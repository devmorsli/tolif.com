using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/storage")]
[Authorize(Roles = "Admin")]
public class StorageController(IStorageService storageService, IMemoryCache cache) : ControllerBase
{
    // Max display width for any template image across the whole site (hero on detail page).
    // Images wider than this are resized down; smaller images are not upscaled.
    private const int MaxWidth = 900;

    // ── GET /api/storage/preview?key=... ──────────────────────────────────────
    /// <summary>
    /// Serves template images optimised for the browser:
    ///   1. Downloads the raw file from MinIO/S3 once.
    ///   2. Resizes to at most 900 px wide and re-encodes as WebP (quality 82).
    ///   3. Caches the compressed result in server memory for 30 minutes.
    /// After the first request every subsequent hit is served from RAM as a
    /// small WebP — no storage round-trip, no large JPEG transfer.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("preview")]
    public async Task<IActionResult> Preview([FromQuery] string key, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(key))
            return BadRequest(new { message = "key is required." });

        var cacheKey = $"storage:preview:v2:{key}";

        if (!cache.TryGetValue(cacheKey, out byte[]? webpBytes))
        {
            try
            {
                var raw = await storageService.DownloadAsync(key, ct);
                webpBytes = Compress(raw);
                cache.Set(cacheKey, webpBytes, TimeSpan.FromMinutes(30));
            }
            catch
            {
                return NotFound();
            }
        }

        Response.Headers.CacheControl = "public, max-age=3600";
        return File(webpBytes!, "image/webp");
    }

    private static byte[] Compress(byte[] raw)
    {
        using var image = Image.Load(raw);

        if (image.Width > MaxWidth)
            image.Mutate(x => x.Resize(MaxWidth, 0)); // 0 = auto height

        using var ms = new MemoryStream();
        image.SaveAsWebp(ms, new WebpEncoder { Quality = 82 });
        return ms.ToArray();
    }
}
