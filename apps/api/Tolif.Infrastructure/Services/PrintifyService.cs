using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.Services;

/// <summary>
/// Printify REST API client.
/// Docs: https://developers.printify.com
/// Auth: Bearer token.
/// </summary>
public sealed class PrintifyService(ISettingsService settings, IHttpClientFactory httpClientFactory)
    : IPrintProvider
{
    private const string BaseUrl = "https://api.printify.com/v1";

    public PrintProvider ProviderType => PrintProvider.Printify;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    // ── HTTP ───────────────────────────────────────────────────────────────────

    private async Task<HttpClient> CreateClientAsync(CancellationToken ct)
    {
        var apiKey = await settings.GetAsync("printify.api_key", ct)
                     ?? throw new InvalidOperationException(
                         "Printify API key is not configured. Set 'printify.api_key' in admin Settings.");

        var client = httpClientFactory.CreateClient("printify");
        client.BaseAddress = new Uri(BaseUrl);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);
        client.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    private static StringContent JsonBody(object payload) =>
        new(JsonSerializer.Serialize(payload, JsonOpts), Encoding.UTF8, "application/json");

    // ── IPrintProvider ─────────────────────────────────────────────────────────

    public async Task<PrintOrderResult> SubmitOrderAsync(PrintOrderRequest request, CancellationToken ct = default)
    {
        try
        {
            var client  = await CreateClientAsync(ct);
            var shopId  = await settings.GetAsync("printify.shop_id", ct)
                          ?? throw new InvalidOperationException("Printify shop ID not configured.");

            // Build address from JSON
            var addr = JsonSerializer.Deserialize<ShippingAddress>(
                           request.ShippingAddressJson, JsonOpts)
                       ?? throw new InvalidOperationException("Invalid shipping address JSON.");

            var lineItems = request.LineItems.Select(li => new
            {
                print_provider_id = (int?)null,
                blueprint_id      = (int?)null,
                variant_id        = int.TryParse(li.ProviderVariantId, out var vid) ? vid : 0,
                print_areas       = new Dictionary<string, string>
                {
                    ["front"] = li.PrintFileKey    // Printify accepts public URLs
                },
                quantity          = li.Quantity,
            }).ToArray();

            var body = new
            {
                label           = $"TOL-{request.OrderId:N[..8]}",
                line_items      = lineItems,
                shipping_method = 1,
                send_shipping_notification = true,
                address_to = new
                {
                    first_name = request.CustomerName.Split(' ').FirstOrDefault() ?? request.CustomerName,
                    last_name  = request.CustomerName.Contains(' ')
                                   ? request.CustomerName[(request.CustomerName.IndexOf(' ') + 1)..]
                                   : "",
                    email      = request.CustomerEmail,
                    address1   = addr.Line1,
                    address2   = addr.Line2 ?? "",
                    city       = addr.City,
                    state      = addr.State ?? "",
                    zip        = addr.PostalCode,
                    country    = addr.Country,
                }
            };

            var res = await client.PostAsync(
                $"/v1/shops/{shopId}/orders.json",
                JsonBody(body), ct);

            if (!res.IsSuccessStatusCode)
            {
                var err = await res.Content.ReadAsStringAsync(ct);
                return new PrintOrderResult(false, null, $"Printify {(int)res.StatusCode}: {err}");
            }

            var raw = await res.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(raw);
            var orderId = doc.RootElement.GetProperty("id").GetString()!;

            // Submit (publish) the order to production
            var submitRes = await client.PostAsync(
                $"/v1/shops/{shopId}/orders/{orderId}/send_to_production.json",
                JsonBody(new { }), ct);

            if (!submitRes.IsSuccessStatusCode)
                return new PrintOrderResult(false, orderId,
                    $"Order created ({orderId}) but send_to_production failed.");

            return new PrintOrderResult(true, orderId);
        }
        catch (Exception ex)
        {
            return new PrintOrderResult(false, null, ex.Message);
        }
    }

    public async Task CancelOrderAsync(string providerOrderId, CancellationToken ct = default)
    {
        var client = await CreateClientAsync(ct);
        var shopId = await settings.GetAsync("printify.shop_id", ct)
                     ?? throw new InvalidOperationException("Printify shop ID not configured.");

        var res = await client.PostAsync(
            $"/v1/shops/{shopId}/orders/{providerOrderId}/cancel.json",
            JsonBody(new { }), ct);

        if (!res.IsSuccessStatusCode)
        {
            var err = await res.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"Printify cancel failed: {err}");
        }
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    private record ShippingAddress(
        string Line1,
        string? Line2,
        string City,
        string? State,
        string PostalCode,
        string Country);
}
