using System.Text.Json;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.Services;

/// <summary>
/// Adapts IPrintfulService (the rich Printful client) to the simpler
/// IPrintProvider interface used by SubmitPrintOrderJob.
/// </summary>
public sealed class PrintfulAdapterService(
    IPrintfulService printfulService,
    IStorageService  storageService) : IPrintProvider
{
    public PrintProvider ProviderType => PrintProvider.Printful;

    public async Task<PrintOrderResult> SubmitOrderAsync(PrintOrderRequest request, CancellationToken ct = default)
    {
        try
        {
            // Deserialise shipping address
            var addr = JsonSerializer.Deserialize<ShippingAddress>(
                           request.ShippingAddressJson,
                           new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                       ?? throw new InvalidOperationException("Invalid shipping address JSON.");

            // Build line items
            var draftItems = new List<PrintfulDraftItem>();
            foreach (var li in request.LineItems)
            {
                if (!long.TryParse(li.ProviderVariantId, out var variantId))
                    throw new InvalidOperationException($"Printful variant ID must be numeric, got: {li.ProviderVariantId}");

                // Look up the correct placement + technique for this variant from Printful v2 catalog
                var placementInfo = await printfulService.GetVariantPlacementAsync(variantId, ct);
                if (placementInfo is null)
                    throw new InvalidOperationException(
                        $"Could not retrieve placement info for Printful variant {variantId}. " +
                        "Check the Printful API key and variant ID.");

                // Download the portrait from MinIO on our server, then push the bytes directly to
                // Printful's file library. This avoids Printful needing to reach storage.tolif.com
                // (which may not be publicly accessible from Printful's servers).
                var fileName    = Path.GetFileName(li.PrintFileKey);
                var contentType = fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase)
                    ? "image/png" : "image/jpeg";
                var fileBytes   = await storageService.DownloadAsync(li.PrintFileKey, ct);
                var printfulFileId = await printfulService.UploadFileBytesAsync(fileBytes, fileName, contentType, ct);

                draftItems.Add(new PrintfulDraftItem(
                    VariantId:      variantId,
                    Quantity:       li.Quantity,
                    Placement:      placementInfo.Placement,
                    Technique:      placementInfo.Technique,
                    PrintfulFileId: printfulFileId));
            }

            var draftRequest = new PrintfulDraftOrderRequest(
                RecipientName:         request.CustomerName,
                RecipientAddress1:     addr.Line1,
                RecipientAddress2:     addr.Line2,
                RecipientCity:         addr.City,
                RecipientStateCode:    addr.State ?? "",
                RecipientCountryCode:  addr.Country,
                RecipientZip:          addr.PostalCode,
                RecipientEmail:        request.CustomerEmail,
                RecipientPhone:        "",
                Items:                 draftItems);

            var draft = await printfulService.CreateDraftOrderAsync(draftRequest, ct);
            if (!draft.Success)
                return new PrintOrderResult(false, null, draft.ErrorMessage);

            // Confirm (submit to production).
            // Printful v2 needs time after draft creation to calculate costs and process the design.
            // Retry up to 8 times with increasing delays (5s, 10s, 15s … 40s = ~2 min total).
            PrintfulDraftResult confirm = default!;
            const int maxConfirmAttempts = 8;
            for (int attempt = 1; attempt <= maxConfirmAttempts; attempt++)
            {
                if (attempt > 1)
                    await Task.Delay(TimeSpan.FromSeconds(attempt * 5), ct); // 5s, 10s, 15s, 20s, 25s, 30s, 35s

                confirm = await printfulService.ConfirmOrderAsync(draft.PrintfulOrderId!, ct);
                if (confirm.Success)
                    break;

                // Printful returns one of these while it is still processing
                bool stillPending = confirm.ErrorMessage is { } msg && (
                    msg.Contains("cost calculations still running", StringComparison.OrdinalIgnoreCase) ||
                    msg.Contains("design is still processing",      StringComparison.OrdinalIgnoreCase) ||
                    msg.Contains("still processing",                StringComparison.OrdinalIgnoreCase));

                if (!stillPending || attempt == maxConfirmAttempts)
                    return new PrintOrderResult(false, draft.PrintfulOrderId, confirm.ErrorMessage);
            }

            if (!confirm.Success)
                return new PrintOrderResult(false, draft.PrintfulOrderId, confirm.ErrorMessage);

            return new PrintOrderResult(true, draft.PrintfulOrderId);
        }
        catch (Exception ex)
        {
            return new PrintOrderResult(false, null, ex.Message);
        }
    }

    public async Task CancelOrderAsync(string providerOrderId, CancellationToken ct = default)
        => await printfulService.CancelOrderAsync(providerOrderId, ct);

    private record ShippingAddress(
        string Line1,
        string? Line2,
        string City,
        string? State,
        string PostalCode,
        string Country);
}
