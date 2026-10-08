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

            // Build line items — generate a presigned URL for each print file
            var draftItems = new List<PrintfulDraftItem>();
            foreach (var li in request.LineItems)
            {
                // Generate a 60-minute presigned URL so Printful can pull the file
                var signedUrl = await storageService.GenerateDownloadUrlAsync(
                    li.PrintFileKey, TimeSpan.FromHours(1), ct);

                if (!long.TryParse(li.ProviderVariantId, out var variantId))
                    throw new InvalidOperationException($"Printful variant ID must be numeric, got: {li.ProviderVariantId}");

                draftItems.Add(new PrintfulDraftItem(
                    VariantId:    variantId,
                    Quantity:     li.Quantity,
                    PrintFileUrl: signedUrl));
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

            // Confirm (submit to production)
            var confirm = await printfulService.ConfirmOrderAsync(draft.PrintfulOrderId!, ct);
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
