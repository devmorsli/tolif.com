using System.Text;
using System.Text.Json;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.AI;

/// <summary>
/// Generates portrait images using Google Gemini's multimodal image editing capability.
/// Strategy: send the template image (art style reference) + customer photos, instruct
/// Gemini to maintain the exact art style / composition but replace the subjects.
/// </summary>
public class GeminiImageGenerationProvider(
    ISettingsService settingsService,
    IStorageService storageService,
    IHttpClientFactory httpClientFactory) : IImageGenerationProvider
{
    public AiProvider ProviderType => AiProvider.Gemini;

    public async Task<GenerationResult> GenerateAsync(GenerationRequest request, CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            var apiKey = await settingsService.GetAsync("ai.gemini.apiKey", ct);
            if (string.IsNullOrWhiteSpace(apiKey))
                return Fail("Gemini API key is not configured.", sw);

            var model = await settingsService.GetAsync("ai.gemini.model", ct);
            if (string.IsNullOrWhiteSpace(model)) model = "gemini-2.0-flash-exp";

            // ── Download the template image (art-style reference) ────────────
            var templateImageBytes = await storageService.DownloadAsync(request.TemplateImageKey, ct);
            var templateBase64 = Convert.ToBase64String(templateImageBytes);

            // ── Download all customer-uploaded photos ────────────────────────
            var customerParts = new List<object>();
            foreach (var uploadKey in request.UploadedImageKeys)
            {
                var bytes = await storageService.DownloadAsync(uploadKey, ct);
                customerParts.Add(new
                {
                    inline_data = new
                    {
                        mime_type = "image/jpeg",
                        data = Convert.ToBase64String(bytes)
                    }
                });
            }

            // ── Build the prompt ─────────────────────────────────────────────
            var instruction = $"""
                You are an AI portrait artist. I will give you:
                1. A TEMPLATE IMAGE — this defines the art style, composition, colour palette, lighting, and mood. Study it carefully.
                2. One or more CUSTOMER PHOTOS — these show the real people/pets that must appear in the final portrait.

                Your task: create a new portrait that:
                - Preserves the EXACT art style, medium, colour palette, composition, background, and mood of the template image.
                - Replaces every person/animal in the template with the corresponding subject(s) from the customer photos, maintaining their likeness.
                - Maintains the same framing, poses, and overall scene layout.
                - Produces a high-quality, seamless result that looks professionally made in that art style.

                Additional context from the template:
                {request.Prompt}

                Generate the final portrait image now.
                """;

            // ── Assemble the Gemini request ──────────────────────────────────
            var parts = new List<object>
            {
                new { text = instruction },
                // Template image (art-style reference)
                new
                {
                    inline_data = new
                    {
                        mime_type = "image/jpeg",
                        data = templateBase64
                    }
                }
            };
            // Add customer photos after
            parts.AddRange(customerParts);

            var body = new
            {
                contents = new[]
                {
                    new { role = "user", parts = parts.ToArray() }
                },
                generationConfig = new
                {
                    responseModalities = new[] { "image", "text" },
                    temperature = 1.0
                }
            };

            var http = httpClientFactory.CreateClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            var response = await http.PostAsync(url,
                new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"), ct);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                return Fail($"Gemini error {(int)response.StatusCode}: {err}", sw);
            }

            var raw = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(raw);

            // Find the inline_data part (generated image)
            var candidates = doc.RootElement.GetProperty("candidates");
            foreach (var candidate in candidates.EnumerateArray())
            {
                var contentParts = candidate.GetProperty("content").GetProperty("parts");
                foreach (var part in contentParts.EnumerateArray())
                {
                    JsonElement inlineData;
                    if (!part.TryGetProperty("inline_data", out inlineData) &&
                        !part.TryGetProperty("inlineData", out inlineData))
                        continue;

                    {
                        var imageData = Convert.FromBase64String(
                            inlineData.GetProperty("data").GetString()!);

                        sw.Stop();
                        return new GenerationResult(
                            Success: true,
                            ImageData: imageData,
                            Status: AiGenerationStatus.Success,
                            CostUsd: null,
                            DurationMs: (int)sw.ElapsedMilliseconds);
                    }
                }
            }

            return Fail("Gemini did not return an image in the response.", sw);
        }
        catch (Exception ex)
        {
            return Fail(ex.Message, sw);
        }
    }

    private static GenerationResult Fail(string message, System.Diagnostics.Stopwatch sw)
    {
        sw.Stop();
        return new GenerationResult(
            Success: false,
            ImageData: null,
            Status: AiGenerationStatus.ProviderError,
            CostUsd: null,
            DurationMs: (int)sw.ElapsedMilliseconds,
            ErrorMessage: message);
    }
}
