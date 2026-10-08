using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Tolif.Application.Interfaces;

namespace Tolif.Infrastructure.Services;

/// <summary>
/// Printful REST API v2 client (falls back to v1 where v2 is missing a feature).
/// API reference: https://developers.printful.com/docs
/// Auth: Bearer token sent via Authorization header (private token from store settings).
/// </summary>
public sealed class PrintfulService(ISettingsService settings, IHttpClientFactory httpClientFactory)
    : IPrintfulService
{
    private const string BaseUrl = "https://api.printful.com";

    // Required webhook event types
    private static readonly string[] RequiredWebhookTypes =
    [
        "package_shipped",
        "order_failed",
        "order_canceled"
    ];

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    // ── HTTP client factory ────────────────────────────────────────────────────

    private async Task<HttpClient> CreateClientAsync(CancellationToken ct)
    {
        var apiKey = await settings.GetAsync("printful.api_key", ct)
                     ?? throw new InvalidOperationException(
                         "Printful API key is not configured. Set 'printful.api_key' in admin Settings.");

        var client = httpClientFactory.CreateClient("printful");
        client.BaseAddress = new Uri(BaseUrl);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);
        client.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static StringContent JsonBody(object payload) =>
        new(JsonSerializer.Serialize(payload, Json), Encoding.UTF8, "application/json");

    private static async Task EnsureSuccessAsync(HttpResponseMessage res, CancellationToken ct)
    {
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException(
                $"Printful API error {(int)res.StatusCode}: {body}", null, res.StatusCode);
        }
    }

    // ── Test connection ────────────────────────────────────────────────────────

    public async Task<string?> TestConnectionAsync(CancellationToken ct = default)
    {
        try
        {
            var client = await CreateClientAsync(ct);
            var res    = await client.GetAsync("/v2/stores", ct);
            if (res.IsSuccessStatusCode) return null;
            var body = await res.Content.ReadAsStringAsync(ct);
            return $"HTTP {(int)res.StatusCode}: {body}";
        }
        catch (Exception ex)
        {
            return ex.Message;
        }
    }

    // ── Catalog sync ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PrintfulCatalogProduct>> SyncCatalogAsync(CancellationToken ct = default)
    {
        var client   = await CreateClientAsync(ct);
        var products = new List<PrintfulCatalogProduct>();

        // v1 endpoint — v2 catalog listing is still in preview / rate-limited
        var res  = await client.GetAsync("/products?limit=100", ct);
        await EnsureSuccessAsync(res, ct);
        var root = JsonNode.Parse(await res.Content.ReadAsStringAsync(ct));
        var list = root?["result"]?.AsArray();
        if (list is null) return products;

        foreach (var p in list)
        {
            var pid  = p?["id"]?.GetValue<long>() ?? 0;
            var name = p?["title"]?.GetValue<string>() ?? "";
            var type = p?["type"]?.GetValue<string>() ?? "";
            var img  = p?["image"]?.GetValue<string>();

            // fetch variants for this product
            var vRes = await client.GetAsync($"/products/{pid}", ct);
            if (!vRes.IsSuccessStatusCode) continue;

            var vRoot     = JsonNode.Parse(await vRes.Content.ReadAsStringAsync(ct));
            var varArray  = vRoot?["result"]?["variants"]?.AsArray();
            var variants  = new List<PrintfulCatalogVariant>();

            if (varArray is not null)
            {
                foreach (var v in varArray)
                {
                    variants.Add(new PrintfulCatalogVariant(
                        VariantId: v?["id"]?.GetValue<long>() ?? 0,
                        Name:      v?["name"]?.GetValue<string>() ?? "",
                        Size:      v?["size"]?.GetValue<string>(),
                        Color:     v?["color"]?.GetValue<string>(),
                        Price:     decimal.TryParse(v?["price"]?.ToString(), out var pr) ? pr : 0m,
                        Currency:  v?["currency"]?.GetValue<string>() ?? "USD"
                    ));
                }
            }

            products.Add(new PrintfulCatalogProduct(pid, name, type, img, variants));
        }

        return products;
    }

    // ── File upload ────────────────────────────────────────────────────────────

    public async Task<string> UploadFileAsync(string publicUrl, string fileName, CancellationToken ct = default)
    {
        var client = await CreateClientAsync(ct);
        var res = await client.PostAsync("/v2/files",
            JsonBody(new { url = publicUrl, filename = fileName, type = "default" }), ct);
        await EnsureSuccessAsync(res, ct);
        var root = JsonNode.Parse(await res.Content.ReadAsStringAsync(ct));
        return root?["data"]?["id"]?.GetValue<long>().ToString()
               ?? throw new InvalidOperationException("Printful file upload returned no ID.");
    }

    // ── Draft order ────────────────────────────────────────────────────────────

    public async Task<PrintfulDraftResult> CreateDraftOrderAsync(
        PrintfulDraftOrderRequest request, CancellationToken ct = default)
    {
        var client = await CreateClientAsync(ct);

        var body = new
        {
            recipient = new
            {
                name         = request.RecipientName,
                address1     = request.RecipientAddress1,
                address2     = request.RecipientAddress2,
                city         = request.RecipientCity,
                state_code   = request.RecipientStateCode,
                country_code = request.RecipientCountryCode,
                zip          = request.RecipientZip,
                email        = request.RecipientEmail,
                phone        = request.RecipientPhone,
            },
            items = request.Items.Select(i => new
            {
                variant_id = i.VariantId,
                quantity   = i.Quantity,
                name       = i.Label,
                files      = new[] { new { type = "default", url = i.PrintFileUrl } },
            }).ToArray(),
        };

        try
        {
            var res = await client.PostAsync("/v2/orders", JsonBody(body), ct);
            await EnsureSuccessAsync(res, ct);
            var root        = JsonNode.Parse(await res.Content.ReadAsStringAsync(ct));
            var orderId     = root?["data"]?["id"]?.ToString();
            var dashUrl     = root?["data"]?["dashboard_url"]?.GetValue<string>();
            return new PrintfulDraftResult(true, orderId, dashUrl);
        }
        catch (Exception ex)
        {
            return new PrintfulDraftResult(false, null, null, ex.Message);
        }
    }

    // ── Confirm order ──────────────────────────────────────────────────────────

    public async Task<PrintfulDraftResult> ConfirmOrderAsync(
        string printfulOrderId, CancellationToken ct = default)
    {
        var client = await CreateClientAsync(ct);
        try
        {
            var res = await client.PostAsync(
                $"/v2/orders/{printfulOrderId}/confirmation", JsonBody(new { }), ct);
            await EnsureSuccessAsync(res, ct);
            var root    = JsonNode.Parse(await res.Content.ReadAsStringAsync(ct));
            var dashUrl = root?["data"]?["dashboard_url"]?.GetValue<string>();
            return new PrintfulDraftResult(true, printfulOrderId, dashUrl);
        }
        catch (Exception ex)
        {
            return new PrintfulDraftResult(false, printfulOrderId, null, ex.Message);
        }
    }

    // ── Cancel order ───────────────────────────────────────────────────────────

    public async Task CancelOrderAsync(string printfulOrderId, CancellationToken ct = default)
    {
        var client = await CreateClientAsync(ct);
        var res    = await client.DeleteAsync($"/v2/orders/{printfulOrderId}", ct);
        await EnsureSuccessAsync(res, ct);
    }

    // ── Shipping rates ─────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PrintfulShippingRate>> GetShippingRatesAsync(
        PrintfulShippingRequest request, CancellationToken ct = default)
    {
        var client = await CreateClientAsync(ct);

        var body = new
        {
            recipient = new
            {
                country_code = request.RecipientCountryCode,
                state_code   = request.RecipientStateCode,
                city         = request.RecipientCity,
                zip          = request.RecipientZip,
            },
            items = request.Items.Select(i => new
            {
                variant_id = i.VariantId,
                quantity   = i.Quantity,
            }).ToArray(),
        };

        var res = await client.PostAsync("/v2/shipping/rates", JsonBody(body), ct);
        await EnsureSuccessAsync(res, ct);
        var root  = JsonNode.Parse(await res.Content.ReadAsStringAsync(ct));
        var rates = root?["data"]?.AsArray() ?? [];

        return rates.Select(r => new PrintfulShippingRate(
            Id:       r?["id"]?.GetValue<string>()  ?? "",
            Name:     r?["name"]?.GetValue<string>() ?? "",
            Rate:     decimal.TryParse(r?["rate"]?.ToString(), out var rate) ? rate : 0m,
            Currency: r?["currency"]?.GetValue<string>() ?? "USD",
            MinDays:  r?["min_delivery_days"]?.GetValue<int?>(),
            MaxDays:  r?["max_delivery_days"]?.GetValue<int?>()
        )).ToList();
    }

    // ── Webhooks ───────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PrintfulWebhook>> GetWebhooksAsync(CancellationToken ct = default)
    {
        var client = await CreateClientAsync(ct);
        var res    = await client.GetAsync("/v2/webhooks", ct);
        await EnsureSuccessAsync(res, ct);
        var root   = JsonNode.Parse(await res.Content.ReadAsStringAsync(ct));
        var arr    = root?["data"]?.AsArray() ?? [];

        return arr.Select(w => new PrintfulWebhook(
            Id:    w?["id"]?.GetValue<long>() ?? 0,
            Url:   w?["url"]?.GetValue<string>() ?? "",
            Types: w?["types"]?.AsArray().Select(t => t?.GetValue<string>() ?? "").ToList()
                   ?? (IReadOnlyList<string>)[]
        )).ToList();
    }

    public async Task RegisterWebhooksAsync(string baseUrl, CancellationToken ct = default)
    {
        var client      = await CreateClientAsync(ct);
        var webhookUrl  = $"{baseUrl.TrimEnd('/')}/api/webhooks/printful";

        // Delete existing webhooks first to avoid duplicates
        var existing = await GetWebhooksAsync(ct);
        foreach (var wh in existing)
        {
            await client.DeleteAsync($"/v2/webhooks/{wh.Id}", ct);
        }

        // Register our webhook
        var body = new
        {
            url    = webhookUrl,
            types  = RequiredWebhookTypes,
        };
        var res = await client.PostAsync("/v2/webhooks", JsonBody(body), ct);
        await EnsureSuccessAsync(res, ct);
    }
}
