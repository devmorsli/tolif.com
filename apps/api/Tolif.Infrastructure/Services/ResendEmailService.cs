using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Tolif.Application.Interfaces;

namespace Tolif.Infrastructure.Services;

public class ResendEmailService(
    IHttpClientFactory httpClientFactory,
    ISettingsService settings,
    ILogger<ResendEmailService> logger) : IEmailService
{
    private const string ResendApiUrl = "https://api.resend.com/emails";

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var apiKey   = await settings.GetAsync("resend.apiKey",      ct) ?? "";
        var from     = await settings.GetAsync("email.fromAddress",  ct) ?? "noreply@tolif.com";
        var fromName = await settings.GetAsync("email.fromName",     ct) ?? "Tolif";

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException(
                "Resend API key is not configured. Set resend.apiKey in Admin → Settings → Email.");

        var client = httpClientFactory.CreateClient("resend");
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);

        var payload = new
        {
            from    = $"{fromName} <{from}>",
            to      = new[] { message.To },
            subject = message.Subject,
            html    = message.HtmlBody,
            text    = message.PlainTextBody,
        };

        var response = await client.PostAsJsonAsync(ResendApiUrl, payload, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Resend API error {Status}: {Body}", (int)response.StatusCode, body);
            throw new HttpRequestException(
                $"Resend returned HTTP {(int)response.StatusCode}: {body}");
        }

        logger.LogInformation("Email sent via Resend to {To} — {Subject}", message.To, message.Subject);
    }
}
