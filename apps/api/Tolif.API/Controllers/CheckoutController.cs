using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/checkout")]
public class CheckoutController(
    IApplicationDbContext            db,
    ISettingsService                 settings,
    ILogger<CheckoutController>      logger) : ControllerBase
{
    // ── POST /api/checkout/session ────────────────────────────────────────────
    /// <summary>
    /// Creates an Order in the database and a Stripe Checkout Session.
    /// Returns the Stripe session URL to redirect the customer to.
    ///
    /// Body:
    /// {
    ///   "sessionId":       "guid",          // PortraitSession ID
    ///   "variantId":       "guid",          // ProductVariant ID
    ///   "quantity":        1,
    ///   "customerEmail":   "...",
    ///   "customerName":    "...",           // optional
    ///   "shippingAddress": { ... },         // required for physical products
    ///   "discountCode":    "SAVE10"         // optional
    /// }
    /// </summary>
    [HttpPost("session")]
    [EnableRateLimiting("checkout")]
    public async Task<IActionResult> CreateSession(
        [FromBody] CreateCheckoutRequest req,
        CancellationToken ct)
    {
        // ── Validate portrait session ──────────────────────────────────────
        if (!Guid.TryParse(req.SessionId, out var sessionId))
            return BadRequest(new { message = "Invalid sessionId." });

        var portraitSession = await db.PortraitSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        if (portraitSession is null)
            return NotFound(new { message = "Portrait session not found." });

        if (portraitSession.Status != PortraitSessionStatus.PreviewReady)
            return BadRequest(new { message = "Portrait session is not ready for checkout." });

        // ── Validate product variant ───────────────────────────────────────
        if (!Guid.TryParse(req.VariantId, out var variantId))
            return BadRequest(new { message = "Invalid variantId." });

        var variant = await db.ProductVariants
            .Include(v => v.Product)
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == variantId && v.IsActive, ct);

        if (variant is null)
            return NotFound(new { message = "Product variant not found." });

        // ── Validate discount code (optional) ─────────────────────────────
        DiscountCode? discount = null;
        if (!string.IsNullOrWhiteSpace(req.DiscountCode))
        {
            discount = await db.DiscountCodes.FirstOrDefaultAsync(
                d => d.Code == req.DiscountCode &&
                     d.IsActive &&
                     (d.ExpiresAt == null || d.ExpiresAt > DateTime.UtcNow) &&
                     (d.MaxUses == null || d.Uses < d.MaxUses), ct);

            if (discount is null)
                return BadRequest(new { message = "Discount code is invalid or expired." });
        }

        // ── Stripe config ──────────────────────────────────────────────────
        var stripeSecretKey = await settings.GetAsync("stripe.secretKey", ct);
        if (string.IsNullOrWhiteSpace(stripeSecretKey))
            return StatusCode(500, new { message = "Stripe is not configured." });

        StripeConfiguration.ApiKey = stripeSecretKey;

        var siteUrl = await settings.GetAsync("site.url", ct) ?? "https://tolif.com";

        // ── Calculate amount ───────────────────────────────────────────────
        var unitPrice    = variant.Price;
        var currency     = variant.Currency.ToLowerInvariant();

        long amountInCents;
        string? stripeCouponId = null;

        if (discount is not null)
        {
            stripeCouponId = discount.StripeCouponId;
            amountInCents  = discount.Type == "percent"
                ? (long)Math.Round(unitPrice * req.Quantity * (1 - discount.Value / 100m) * 100)
                : (long)Math.Max(0, (unitPrice * req.Quantity - discount.Value) * 100);
        }
        else
        {
            amountInCents = (long)Math.Round(unitPrice * req.Quantity * 100);
        }

        // ── Create Order in DB (Pending) ───────────────────────────────────
        var order = new Domain.Entities.Order
        {
            Id             = Guid.NewGuid(),
            CustomerEmail  = req.CustomerEmail,
            CustomerName   = req.CustomerName,
            Status         = OrderStatus.Pending,
            TotalAmount    = amountInCents / 100m,
            Currency       = variant.Currency,
            DiscountCodeId = discount?.Id,
            ShippingAddressJson = req.ShippingAddress is null
                ? null
                : System.Text.Json.JsonSerializer.Serialize(req.ShippingAddress),
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
        };

        order.Items.Add(new OrderItem
        {
            Id               = Guid.NewGuid(),
            OrderId          = order.Id,
            ProductVariantId = variant.Id,
            PortraitSessionId = sessionId,
            Quantity         = req.Quantity,
            UnitPrice        = variant.Price,
            Currency         = variant.Currency,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
        });

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        // ── Create Stripe Checkout Session ─────────────────────────────────
        var isPhysical = variant.Product?.Type != ProductType.Digital;

        var lineItems = new List<SessionLineItemOptions>
        {
            new()
            {
                PriceData = new SessionLineItemPriceDataOptions
                {
                    Currency    = currency,
                    UnitAmount  = (long)Math.Round(variant.Price * 100),
                    ProductData = new SessionLineItemPriceDataProductDataOptions
                    {
                        Name        = $"{variant.Product?.Name ?? "AI Portrait"} — {variant.Size}",
                        Description = "Custom AI-generated portrait by Tolif",
                    },
                },
                Quantity = req.Quantity,
            }
        };

        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = ["card"],
            LineItems          = lineItems,
            Mode               = "payment",
            CustomerEmail      = req.CustomerEmail,
            SuccessUrl         = $"{siteUrl}/order/{order.AccessToken}?success=1",
            CancelUrl          = $"{siteUrl}/create?cancelled=1",
            Metadata           = new Dictionary<string, string>
            {
                ["orderId"]   = order.Id.ToString(),
                ["sessionId"] = sessionId.ToString(),
            },
            Discounts = stripeCouponId is null
                ? null
                : [new SessionDiscountOptions { Coupon = stripeCouponId }],
            ShippingAddressCollection = isPhysical
                ? new SessionShippingAddressCollectionOptions
                  {
                      AllowedCountries = ["FR", "DE", "GB", "US", "CA", "NL", "BE", "ES", "IT", "PT"]
                  }
                : null,
        };

        try
        {
            var service        = new SessionService();
            var stripeSession  = await service.CreateAsync(options, cancellationToken: ct);

            // Update order with Stripe session ID
            var savedOrder = await db.Orders.FindAsync([order.Id], ct);
            if (savedOrder is not null)
            {
                savedOrder.StripeSessionId = stripeSession.Id;
                await db.SaveChangesAsync(ct);
            }

            return Ok(new
            {
                checkoutUrl = stripeSession.Url,
                orderId     = order.Id,
                sessionId   = stripeSession.Id,
            });
        }
        catch (StripeException ex)
        {
            logger.LogError(ex, "Stripe session creation failed for order {OrderId}", order.Id);
            return StatusCode(500, new { message = "Could not create Stripe checkout session.", detail = ex.Message });
        }
    }
}

public record CreateCheckoutRequest(
    string SessionId,
    string VariantId,
    int    Quantity,
    string CustomerEmail,
    string? CustomerName,
    ShippingAddressDto? ShippingAddress,
    string? DiscountCode
);

public record ShippingAddressDto(
    string Line1,
    string? Line2,
    string City,
    string? State,
    string PostalCode,
    string Country
);
