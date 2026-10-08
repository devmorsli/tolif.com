using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/templates")]
[Authorize(Roles = "Admin")]
public class AdminTemplateAiController(
    ISettingsService settingsService,
    IStorageService storageService,
    IHttpClientFactory httpClientFactory) : ControllerBase
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    // ── POST /api/admin/templates/ai-generate-metadata ────────────────────────
    /// <summary>
    /// Given a prompt, calls Gemini to suggest template metadata (name, slug, category, style, SEO, upload slots).
    /// </summary>
    [HttpPost("ai-generate-metadata")]
    public async Task<IActionResult> GenerateMetadata([FromBody] GenerateMetadataRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Prompt))
            return BadRequest(new { message = "Prompt is required." });

        var apiKey = await settingsService.GetAsync("ai.gemini.apiKey", ct);
        if (string.IsNullOrWhiteSpace(apiKey))
            return BadRequest(new { message = "Gemini API key is not configured. Go to Settings → AI Providers." });

        var model = (await settingsService.GetAsync("ai.gemini.textModel", ct))?.Trim();
        if (string.IsNullOrWhiteSpace(model)) model = "gemini-2.0-flash";

        var systemInstruction = """
            You are a creative director for an AI portrait studio called Tolif.
            Given an AI portrait generation prompt, generate listing metadata for a template.
            Respond ONLY with a valid JSON object — no markdown, no explanation, no extra text.
            The JSON must have exactly these keys:
            {
              "name": "Short human-friendly template name (3-5 words)",
              "slug": "url-safe-slug-no-spaces",
              "category": "one of: Families, Couples, Solo, Pets, Groups",
              "style": "Art style label e.g. Oil Painting, Watercolour, Digital Art, Golden Hour, Impressionist",
              "description": "One-sentence description shown in the listing card (max 100 chars)",
              "seoTitle": "SEO page title max 60 chars — include | Tolif at end",
              "seoDescription": "Meta description max 155 chars, compelling, keyword-rich",
              "uploadSlotsJson": "JSON array string of upload slots e.g. [{\"name\":\"person\",\"label\":\"Your photo\",\"type\":\"person\",\"required\":true}]"
            }
            For uploadSlotsJson: type must be \"person\" or \"pet\". Make slots match the portrait type.
            """;

        var userText = $"Generate metadata for this portrait template:\n\n{req.Prompt}";

        var body = new
        {
            system_instruction = new { parts = new[] { new { text = systemInstruction } } },
            contents = new[] { new { role = "user", parts = new[] { new { text = userText } } } },
            generationConfig = new { responseMimeType = "application/json", temperature = 0.7 }
        };

        var http = httpClientFactory.CreateClient();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        var response = await http.PostAsync(url,
            new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"), ct);

        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            return StatusCode((int)response.StatusCode, new { message = "Gemini API error.", detail = errBody });
        }

        var raw = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(raw);

        // Extract the text part from Gemini response
        var textContent = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        // Clone the element before the document is disposed so ASP.NET can serialize it
        using var metaDoc = JsonDocument.Parse(textContent);
        return Ok(metaDoc.RootElement.Clone());
    }

    // ── POST /api/admin/templates/ai-generate-image ───────────────────────────
    /// <summary>
    /// Generates a sample template preview image.
    /// Uses fal.ai FLUX if configured, otherwise falls back to Gemini image generation.
    /// Uploads the result to S3 and returns the key + presigned URL.
    /// </summary>
    [HttpPost("ai-generate-image")]
    public async Task<IActionResult> GenerateImage([FromBody] GenerateImageRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Prompt))
            return BadRequest(new { message = "Prompt is required." });

        var imagePrompt = $"{req.Prompt}, portrait art, high quality illustration, no text, no watermark, portrait orientation, aspect ratio 3:4, suitable for standard frame sizes 30x40cm and 50x70cm";
        var http = httpClientFactory.CreateClient();

        // ── Try fal.ai FLUX first ────────────────────────────────────────────
        var falApiKey = await settingsService.GetAsync("ai.falai.apiKey", ct);
        if (!string.IsNullOrWhiteSpace(falApiKey))
        {
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Key", falApiKey);

            var falBody = new
            {
                prompt = imagePrompt,
                image_size = "portrait_4_3",
                num_inference_steps = 4,
                num_images = 1,
                enable_safety_checker = true
            };

            var falResponse = await http.PostAsync(
                "https://fal.run/fal-ai/flux/schnell",
                new StringContent(JsonSerializer.Serialize(falBody), Encoding.UTF8, "application/json"), ct);

            if (!falResponse.IsSuccessStatusCode)
            {
                var errBody = await falResponse.Content.ReadAsStringAsync(ct);
                return StatusCode((int)falResponse.StatusCode, new { message = "fal.ai error.", detail = errBody });
            }

            var falRaw = await falResponse.Content.ReadAsStringAsync(ct);
            using var falDoc = JsonDocument.Parse(falRaw);
            var imageUrl = falDoc.RootElement
                .GetProperty("images")[0]
                .GetProperty("url")
                .GetString();

            if (string.IsNullOrEmpty(imageUrl))
                return StatusCode(500, new { message = "No image returned from fal.ai." });

            var imageBytes = await http.GetByteArrayAsync(imageUrl, ct);
            var key = $"templates/{Guid.NewGuid()}.jpg";
            await storageService.UploadAsync(key, imageBytes, "image/jpeg", ct);
            var presignedUrl = await storageService.GenerateDownloadUrlAsync(key, TimeSpan.FromHours(24), ct);
            return Ok(new { key, url = presignedUrl });
        }

        // ── Fall back to Gemini image generation ─────────────────────────────
        var geminiApiKey = await settingsService.GetAsync("ai.gemini.apiKey", ct);
        if (string.IsNullOrWhiteSpace(geminiApiKey))
            return BadRequest(new { message = "No image AI provider configured. Add a fal.ai or Gemini API key in Settings → AI Providers." });

        var model = (await settingsService.GetAsync("ai.gemini.model", ct))?.Trim();
        if (string.IsNullOrWhiteSpace(model)) model = "gemini-2.0-flash-exp";

        var geminiBody = new
        {
            contents = new[] { new { role = "user", parts = new[] { new { text = imagePrompt } } } },
            generationConfig = new { responseModalities = new[] { "image", "text" }, temperature = 1.0 }
        };

        var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={geminiApiKey}";
        var geminiResponse = await http.PostAsync(geminiUrl,
            new StringContent(JsonSerializer.Serialize(geminiBody), Encoding.UTF8, "application/json"), ct);

        if (!geminiResponse.IsSuccessStatusCode)
        {
            var errBody = await geminiResponse.Content.ReadAsStringAsync(ct);
            return StatusCode((int)geminiResponse.StatusCode, new { message = "Gemini image generation error.", detail = errBody });
        }

        var geminiRaw = await geminiResponse.Content.ReadAsStringAsync(ct);
        using var geminiDoc = JsonDocument.Parse(geminiRaw);

        byte[]? geminiImageData = null;
        foreach (var candidate in geminiDoc.RootElement.GetProperty("candidates").EnumerateArray())
        {
            foreach (var part in candidate.GetProperty("content").GetProperty("parts").EnumerateArray())
            {
                // Gemini may return inline_data (snake_case) or inlineData (camelCase)
                JsonElement inlineData;
                if (!part.TryGetProperty("inline_data", out inlineData) &&
                    !part.TryGetProperty("inlineData", out inlineData))
                    continue;

                geminiImageData = Convert.FromBase64String(inlineData.GetProperty("data").GetString()!);
                break;
            }
            if (geminiImageData != null) break;
        }

        if (geminiImageData == null)
        {
            var preview = geminiRaw.Length > 800 ? geminiRaw[..800] + "…" : geminiRaw;
            return StatusCode(500, new { message = $"Gemini model '{model}' did not return an image. The model may not support image generation.", detail = preview });
        }

        var geminiKey = $"templates/{Guid.NewGuid()}.jpg";
        await storageService.UploadAsync(geminiKey, geminiImageData, "image/jpeg", ct);
        var geminiPresignedUrl = await storageService.GenerateDownloadUrlAsync(geminiKey, TimeSpan.FromHours(24), ct);
        return Ok(new { key = geminiKey, url = geminiPresignedUrl });
    }

    // ── POST /api/admin/templates/upload-image ────────────────────────────────
    /// <summary>
    /// Accepts a multipart file upload, stores it in S3, returns key + presigned URL.
    /// </summary>
    [HttpPost("upload-image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return BadRequest(new { message = "Only JPG, PNG, and WebP images are accepted." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();

        var contentType = file.ContentType.StartsWith("image/") ? file.ContentType : "image/jpeg";
        var key = $"templates/{Guid.NewGuid()}{ext}";
        await storageService.UploadAsync(key, bytes, contentType, ct);
        var presignedUrl = await storageService.GenerateDownloadUrlAsync(key, TimeSpan.FromHours(24), ct);

        return Ok(new { key, url = presignedUrl });
    }
}

public record GenerateMetadataRequest(string Prompt);
public record GenerateImageRequest(string Prompt);
