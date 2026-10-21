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

            // ── Download template + all customer photos in parallel ──────────
            var templateTask    = storageService.DownloadAsync(request.TemplateImageKey, ct);
            var customerTasks   = request.UploadedImageKeys
                                      .Select(k => storageService.DownloadAsync(k, ct))
                                      .ToList();
            await Task.WhenAll([templateTask, .. customerTasks]);

            var templateBase64  = Convert.ToBase64String(await templateTask);

            var customerParts   = new List<object>();
            foreach (var task in customerTasks)
            {
                customerParts.Add(new
                {
                    inline_data = new
                    {
                        mime_type = "image/jpeg",
                        data = Convert.ToBase64String(await task)
                    }
                });
            }

            // ── Build the prompt ─────────────────────────────────────────────
            // Compute subject summary from slot metadata when available
            int personCount, petCount;
            if (request.SubjectSlots is { Count: > 0 })
            {
                personCount = request.SubjectSlots.Count(s => s.SlotType == "person");
                petCount    = request.SubjectSlots.Count(s => s.SlotType == "pet");
            }
            else
            {
                personCount = request.UploadedImageKeys.Count;
                petCount    = 0;
            }

            int uploadedCount = personCount + petCount;
            int expectedCount = request.ExpectedSubjectCount > 0 ? request.ExpectedSubjectCount : uploadedCount;
            int targetCount   = Math.Max(uploadedCount, expectedCount); // use the larger to avoid losing subjects

            var subjectParts = new List<string>();
            if (personCount > 0) subjectParts.Add($"{personCount} {(personCount == 1 ? "person" : "people")}");
            if (petCount    > 0) subjectParts.Add($"{petCount} {(petCount == 1 ? "pet" : "pets")}");
            var uploadedSummary = subjectParts.Count > 0 ? string.Join(" and ", subjectParts) : $"{uploadedCount} subject(s)";

            // Build the multi-photo hint only when fewer photos were uploaded than expected
            var multiSubjectHint = "";
            if (expectedCount > uploadedCount)
            {
                multiSubjectHint = $"""

                    ⚠ IMPORTANT — FEWER PHOTOS THAN EXPECTED:
                    The template is designed for {expectedCount} subject(s), but only {uploadedCount} photo(s) were provided.
                    Carefully examine each provided photo: if a single photo contains multiple distinct people or pets, treat
                    each visible individual as a separate subject. Extract all {expectedCount} subject(s) needed by scanning
                    across all provided images. If you can only find {uploadedCount} distinct subject(s) total, paint exactly
                    those {uploadedCount} — never invent or clone subjects to fill the count.
                    """;
            }

            var instruction = $"""
                You are an AI portrait artist. You will receive two types of images:

                IMAGE 1 — STYLE REFERENCE ONLY (the template):
                Defines ONLY the art style, medium, colour palette, lighting, and composition.
                The people/pets shown are anonymous PLACEHOLDERS — discard their faces entirely.
                Never copy, blend, or carry over any identity from this image.

                IMAGES 2+ — CUSTOMER PHOTOS (the actual subjects):
                The customer uploaded {uploadedCount} photo(s) showing: {uploadedSummary}.
                These are the ONLY real faces/likenesses to use.{multiSubjectHint}

                ══ RULES ══
                1. Paint exactly {targetCount} subject(s) in the final portrait — no more, no fewer.
                   • If the style-reference shows MORE: remove the extras completely.
                   • If the style-reference shows FEWER: add the extra subjects naturally.
                2. Every face/likeness must come EXCLUSIVELY from the customer photos.
                3. Preserve the art style, colour palette, lighting, and composition of the style reference.
                4. Adjust the layout so all {targetCount} subject(s) fill the scene naturally — no empty chairs, no ghost silhouettes.
                5. Deliver a seamless, high-quality result that looks professionally hand-crafted in that art style.

                Template context: {request.Prompt}

                Generate the final portrait now.
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

            var http = httpClientFactory.CreateClient("ai");
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
