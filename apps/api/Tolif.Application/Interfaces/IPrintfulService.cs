namespace Tolif.Application.Interfaces;

// ── Catalog ────────────────────────────────────────────────────────────────────

public record PrintfulCatalogProduct(
    long ProductId,
    string Name,
    string Type,
    string? Image,
    IReadOnlyList<PrintfulCatalogVariant> Variants
);

public record PrintfulCatalogVariant(
    long VariantId,
    string Name,
    string? Size,
    string? Color,
    decimal Price,
    string Currency
);

// ── Shipping ───────────────────────────────────────────────────────────────────

public record PrintfulShippingRequest(
    string RecipientCountryCode,
    string RecipientStateCode,
    string RecipientCity,
    string RecipientZip,
    IReadOnlyList<PrintfulShippingItem> Items
);

public record PrintfulShippingItem(long VariantId, int Quantity);

public record PrintfulShippingRate(
    string Id,
    string Name,
    decimal Rate,
    string Currency,
    int? MinDays,
    int? MaxDays
);

// ── Orders ─────────────────────────────────────────────────────────────────────

public record PrintfulDraftOrderRequest(
    string RecipientName,
    string RecipientAddress1,
    string? RecipientAddress2,
    string RecipientCity,
    string RecipientStateCode,
    string RecipientCountryCode,
    string RecipientZip,
    string RecipientEmail,
    string RecipientPhone,
    IReadOnlyList<PrintfulDraftItem> Items
);

public record PrintfulDraftItem(
    long VariantId,
    int Quantity,
    string PrintFileUrl,   // presigned URL to the high-res file
    string? Label = null
);

public record PrintfulDraftResult(
    bool Success,
    string? PrintfulOrderId,
    string? DashboardUrl,
    string? ErrorMessage = null
);

// ── Webhooks ───────────────────────────────────────────────────────────────────

public record PrintfulWebhook(
    long Id,
    string Url,
    IReadOnlyList<string> Types
);

// ── Service interface ──────────────────────────────────────────────────────────

public interface IPrintfulService
{
    /// <summary>Verify the stored API key works. Returns null on success, error message on failure.</summary>
    Task<string?> TestConnectionAsync(CancellationToken ct = default);

    /// <summary>Pull products + variants from Printful and return them.</summary>
    Task<IReadOnlyList<PrintfulCatalogProduct>> SyncCatalogAsync(CancellationToken ct = default);

    /// <summary>Upload a file (by public URL) to the Printful file library; returns the Printful file ID.</summary>
    Task<string> UploadFileAsync(string publicUrl, string fileName, CancellationToken ct = default);

    /// <summary>Create a draft order (not yet submitted to production).</summary>
    Task<PrintfulDraftResult> CreateDraftOrderAsync(PrintfulDraftOrderRequest request, CancellationToken ct = default);

    /// <summary>Confirm a draft order after payment succeeds.</summary>
    Task<PrintfulDraftResult> ConfirmOrderAsync(string printfulOrderId, CancellationToken ct = default);

    /// <summary>Cancel an order at Printful.</summary>
    Task CancelOrderAsync(string printfulOrderId, CancellationToken ct = default);

    /// <summary>Estimate shipping rates for a basket.</summary>
    Task<IReadOnlyList<PrintfulShippingRate>> GetShippingRatesAsync(
        PrintfulShippingRequest request, CancellationToken ct = default);

    /// <summary>List webhooks registered for this store.</summary>
    Task<IReadOnlyList<PrintfulWebhook>> GetWebhooksAsync(CancellationToken ct = default);

    /// <summary>Register the set of webhooks Tolif needs (replaces existing).</summary>
    Task RegisterWebhooksAsync(string baseUrl, CancellationToken ct = default);
}
