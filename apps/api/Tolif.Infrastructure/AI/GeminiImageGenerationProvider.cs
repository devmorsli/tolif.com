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

            int totalSubjects = personCount + petCount;
            var subjectParts  = new List<string>();
            if (personCount > 0) subjectParts.Add($"{personCount} {(personCount == 1 ? "person" : "people")}");
            if (petCount    > 0) subjectParts.Add($"{petCount} {(petCount == 1 ? "pet" : "pets")}");
            var subjectSummary = subjectParts.Count > 0 ? string.Join(" and ", subjectParts) : $"{totalSubjects} subject(s)";

            var instruction = $"""
                You are an AI portrait artist. You will receive two types of images:

                IMAGE 1 — STYLE REFERENCE ONLY (the template image):
                This image defines ONLY the art style, medium, colour palette, lighting, composition layout, and mood.
                The people/pets visible in this image are anonymous PLACEHOLDERS. Their faces and identities must be
                completely discarded. Do NOT copy, blend, or carry over any face, likeness, or identity from this image
                into the final portrait under any circumstances.

                IMAGES 2 to {totalSubjects + 1} — THE ACTUAL SUBJECTS (customer photos):
                These are the real people/pets that must appear in the portrait.
                The customer has provided exactly {totalSubjects} subject(s): {subjectSummary}.

                ══ STRICT RULES ══
                1. SUBJECT COUNT IS EXACTLY {totalSubjects}. Paint ONLY the {totalSubjects} subject(s) from the customer photos.
                   - If the style-reference image shows MORE people/pets: remove the extras entirely — do not fill the gap with anyone from the template.
                   - If the style-reference image shows FEWER people/pets: add the extra subjects naturally to the composition.
                2. Every subject's face and likeness must come EXCLUSIVELY from the customer photos provided. Never invent or borrow faces.
                3. Preserve the art style, medium, colour palette, lighting, and composition feel of the style reference exactly.
                4. Adjust the composition layout naturally so that exactly {totalSubjects} subject(s) fill the scene — no empty chairs, no cropped-out ghosts, no phantom silhouettes.
                5. Produce a seamless, high-quality result that looks professionally made in that art style.

                Additional template context:
                {request.Prompt}

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
