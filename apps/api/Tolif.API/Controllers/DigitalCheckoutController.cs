using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/digital-checkout")]
public class DigitalCheckoutController(
    IApplicationDbContext db,
    ISettingsService settings,
    ILogger<DigitalCheckoutController> logger) : ControllerBase
{
    // ── POST /api/digital-checkout/session ────────────────────────────────────
    [HttpPost("session")]
    public async Task<IActionResult> CreateSession(
        [FromBody] DigitalCheckoutRequest req,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.CustomerEmail))
            return BadRequest(new { message = "Email is required." });

        if (!Guid.TryParse(req.TierId, out var tierId))
            return BadRequest(new { message = "Invalid tier ID." });

        var tier = await db.DigitalProductTiers
            .Include(t => t.DigitalProduct)
            .FirstOrDefaultAsync(t => t.Id == tierId && t.IsActive, ct);

        if (tier is null || tier.DigitalProduct is null || !tier.DigitalProduct.IsActive)
            return NotFound(new { message = "Product tier not found." });

        var stripeSecretKey = await settings.GetAsync("stripe.secretKey", ct);
        if (string.IsNullOrWhiteSpace(stripeSecretKey))
            return StatusCode(500, new { message = "Stripe is not configured." });

        StripeConfiguration.ApiKey = stripeSecretKey;
        var siteUrl = await settings.GetAsync("site.url", ct) ?? "https://tolif.com";

        // Create DigitalOrder (pending)
        var order = new DigitalOrder
        {
            CustomerEmail        = req.CustomerEmail,
            CustomerName         = req.CustomerName,
            DigitalProductId     = tier.DigitalProductId,
            DigitalProductTierId = tierId,
            TierName             = tier.TierName,
            TierDisplayName      = tier.DisplayName,
            AmountPaid           = tier.Price,
            Currency             = tier.Currency,
            Status               = "pending",
        };

        db.DigitalOrders.Add(order);
        await db.SaveChangesAsync(ct);

        // Create Stripe Checkout Session
        var currency = tier.Currency.ToLowerInvariant();
        var amountCents = (long)Math.Round(tier.Price * 100);

        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = ["card"],
            LineItems =
            [
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency   = currency,
                        UnitAmount = amountCents,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name        = $"{tier.DigitalProduct.Name} — {tier.DisplayName}",
                            Description = tier.DigitalProduct.Tagline,
                        },
                    },
                    Quantity = 1,
                },
            ],
            Mode          = "payment",
            CustomerEmail = req.CustomerEmail,
            SuccessUrl    = $"{siteUrl}/thank-you?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl     = $"{siteUrl}/#pricing",
            Metadata = new Dictionary<string, string>
            {
                ["digitalOrderId"] = order.Id.ToString(),
                ["tierId"]         = tierId.ToString(),
            },
        };

        try
        {
            var service       = new SessionService();
            var stripeSession = await service.CreateAsync(options, cancellationToken: ct);

            order.StripeSessionId = stripeSession.Id;
            await db.SaveChangesAsync(ct);

            return Ok(new
            {
                checkoutUrl = stripeSession.Url,
                orderId     = order.Id,
            });
        }
        catch (StripeException ex)
        {
            logger.LogError(ex, "Stripe session creation failed for digital order {OrderId}", order.Id);
            return StatusCode(500, new { message = "Could not create Stripe checkout session.", detail = ex.Message });
        }
    }
}

public record DigitalCheckoutRequest(
    string TierId,
    string CustomerEmail,
    string? CustomerName
);
