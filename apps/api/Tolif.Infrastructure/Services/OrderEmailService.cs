using Tolif.Application.Helpers;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;

namespace Tolif.Infrastructure.Services;

public class OrderEmailService(IEmailService email, ISettingsService settings) : IOrderEmailService
{
    public async Task SendOrderConfirmationAsync(Order order, CancellationToken ct = default)
    {
        var siteUrl     = await settings.GetAsync("site.url", ct) ?? "https://tolif.com";
        var apiUrl      = await settings.GetAsync("api.url",  ct) ?? siteUrl;
        var orderNumber = OrderHelper.FormatNumber(order);
        var orderDate   = order.CreatedAt.ToString("d MMMM yyyy");
        var downloadUrl = $"{siteUrl}/order/{order.AccessToken}";
        var greeting    = order.CustomerName is { Length: > 0 } n ? $"Hi {n},<br><br>" : "";

        // ── Portrait preview image (first item with a session preview) ─────────
        var firstSessionId = order.Items
            .Select(i => i.PortraitSession)
            .FirstOrDefault(s => s?.WatermarkedPreviewKey != null)?.Id;

        var portraitSection = firstSessionId.HasValue
            ? $"""
              <tr>
                <td style="background:#1A1714;padding:0;line-height:0;font-size:0;">
                  <a href="{downloadUrl}" style="display:block;">
                    <img
                      src="{apiUrl}/api/portraits/{firstSessionId}/preview"
                      alt="Your Tolif portrait"
                      width="600"
                      style="display:block;width:100%;max-width:600px;height:auto;
                             object-fit:cover;max-height:380px;"
                    />
                  </a>
                </td>
              </tr>
              """
            : "";

        // ── Order items rows ──────────────────────────────────────────────────
        var itemRows = string.Join("", order.Items.Select(i =>
        {
            var name        = i.ProductVariant?.Product?.Name ?? "AI Portrait";
            var size        = i.ProductVariant?.Size is { Length: > 0 } s
                ? $"<br><span style='font-size:11px;color:#A89080;'>{s}</span>" : "";
            var isFree      = i.UnitPrice == 0;
            var amount      = isFree ? "Free" : $"{i.Currency}&nbsp;{i.UnitPrice * i.Quantity:F2}";
            var amountColor = isFree ? "#2D7A4A" : "#1A1714";
            return $"""
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F0E8DF;">
                    <span style="font-size:14px;color:#1A1714;font-weight:500;">{name}</span>{size}
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #F0E8DF;text-align:right;white-space:nowrap;">
                    <span style="font-size:14px;font-weight:600;color:{amountColor};">{amount}</span>
                  </td>
                </tr>
                """;
        }));

        // ── Delivery note ─────────────────────────────────────────────────────
        var hasDigital = order.Items.Any(i =>
            i.ProductVariant?.Product?.Name?
                .Contains("Digital", StringComparison.OrdinalIgnoreCase) == true);
        var hasPrint = order.Items.Any(i =>
            i.ProductVariant?.Product?.Name?
                .Contains("Digital", StringComparison.OrdinalIgnoreCase) != true);

        var deliveryNote = (hasDigital, hasPrint) switch
        {
            (true, true)  => "Your <strong>digital file</strong> is available for immediate download. Your <strong>print order</strong> will be produced and shipped within 5–7 business days.",
            (true, false) => "Your <strong>digital file</strong> is ready for immediate download at the link below.",
            _             => "Your portrait will be produced and <strong>shipped within 5–7 business days</strong>. You'll receive a tracking number by email.",
        };

        // ── Full HTML ─────────────────────────────────────────────────────────
        var html = $"""
            <!DOCTYPE html>
            <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta http-equiv="X-UA-Compatible" content="IE=edge" />
              <title>Your Tolif Portrait is Ready</title>
            </head>
            <body style="margin:0;padding:0;background-color:#EDE8E0;
                         font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                         -webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#EDE8E0;">
                <tr>
                  <td align="center" style="padding:40px 16px;">

                    <!-- Email card (max 600px) -->
                    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
                           style="max-width:600px;width:100%;background:#FFFFFF;border-radius:20px;
                                  overflow:hidden;box-shadow:0 4px 40px rgba(26,23,20,0.14);">

                      <!-- ══ DARK HEADER ══ -->
                      <tr>
                        <td style="background:#1A1714;padding:30px 40px 26px;text-align:center;">
                          <p style="margin:0;font-size:26px;letter-spacing:10px;color:#F5E6D3;
                                    font-weight:300;text-transform:uppercase;
                                    font-family:Georgia,'Times New Roman',serif;">TOLIF</p>
                          <p style="margin:7px 0 0;font-size:9px;letter-spacing:5px;
                                    color:#5C4F46;text-transform:uppercase;font-weight:500;">
                            PORTRAIT STUDIO
                          </p>
                        </td>
                      </tr>

                      <!-- ══ PORTRAIT PREVIEW IMAGE ══ -->
                      {portraitSection}

                      <!-- ══ CONFIRMATION BADGE ══ -->
                      <tr>
                        <td style="background:#FFFFFF;padding:36px 40px 0;text-align:center;">
                          <!-- Green check circle -->
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                                 style="margin:0 auto 18px;">
                            <tr>
                              <td style="width:54px;height:54px;background:#2D4A3E;border-radius:50%;
                                         text-align:center;vertical-align:middle;
                                         font-size:24px;color:#FFFFFF;line-height:54px;">✓</td>
                            </tr>
                          </table>
                          <p style="margin:0 0 4px;font-size:10px;letter-spacing:4px;color:#A89080;
                                    text-transform:uppercase;font-weight:600;">Order Confirmed</p>
                          <h1 style="margin:8px 0 4px;font-size:32px;color:#1A1714;font-weight:300;
                                     font-family:Georgia,'Times New Roman',serif;letter-spacing:1px;">
                            {orderNumber}
                          </h1>
                          <p style="margin:0;font-size:13px;color:#A89080;letter-spacing:0.5px;">
                            {orderDate}
                          </p>
                        </td>
                      </tr>

                      <!-- ══ GREETING + DELIVERY NOTE ══ -->
                      <tr>
                        <td style="background:#FFFFFF;padding:24px 40px 0;">
                          <div style="height:1px;background:#F0E8DF;margin:0 0 22px;"></div>
                          <p style="margin:0 0 22px;font-size:15px;color:#3A3028;line-height:1.85;">
                            {greeting}{deliveryNote}
                          </p>
                          <div style="height:1px;background:#F0E8DF;margin:0 0 20px;"></div>

                          <!-- Summary label -->
                          <p style="margin:0 0 14px;font-size:9px;letter-spacing:4px;
                                    color:#A89080;text-transform:uppercase;font-weight:700;">
                            Order Summary
                          </p>

                          <!-- Items table -->
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            {itemRows}
                            <!-- Total -->
                            <tr>
                              <td colspan="2" style="padding:18px 0 0;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td style="font-size:11px;font-weight:700;color:#1A1714;
                                               text-transform:uppercase;letter-spacing:2px;
                                               vertical-align:bottom;">Total</td>
                                    <td style="text-align:right;vertical-align:bottom;">
                                      <span style="font-size:28px;color:#C4622D;font-weight:700;
                                                   font-family:Georgia,'Times New Roman',serif;">
                                        {order.Currency}&nbsp;{order.TotalAmount:F2}
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- ══ PRIMARY CTA ══ -->
                      <tr>
                        <td style="background:#FFFFFF;padding:30px 40px 12px;text-align:center;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                                 style="margin:0 auto;">
                            <tr>
                              <td style="background:#C4622D;border-radius:50px;">
                                <a href="{downloadUrl}"
                                   style="display:inline-block;padding:17px 46px;color:#FFFFFF;
                                          text-decoration:none;font-size:14px;font-weight:700;
                                          letter-spacing:0.8px;white-space:nowrap;
                                          font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                                  View Order &amp; Download Portrait &#8594;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- URL fallback -->
                      <tr>
                        <td style="background:#FFFFFF;padding:6px 40px 24px;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#B0A090;line-height:1.6;">
                            Can't click?&nbsp;
                            <a href="{downloadUrl}"
                               style="color:#C4622D;text-decoration:none;word-break:break-all;">
                              {downloadUrl}
                            </a>
                          </p>
                        </td>
                      </tr>

                      <!-- ══ TRUST BADGES ══ -->
                      <tr>
                        <td style="background:#FAF7F3;padding:22px 20px;
                                   border-top:1px solid #EDE8E0;border-bottom:1px solid #EDE8E0;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="padding:0 8px;width:33%;">
                                <p style="margin:0 0 5px;font-size:22px;line-height:1;">🔒</p>
                                <p style="margin:0 0 2px;font-size:11px;font-weight:700;
                                          color:#4A3F38;letter-spacing:0.3px;">Secure download</p>
                                <p style="margin:0;font-size:10px;color:#A89080;">30-day access link</p>
                              </td>
                              <td style="background:#E4D8CC;width:1px;padding:0;font-size:0;">&nbsp;</td>
                              <td align="center" style="padding:0 8px;width:33%;">
                                <p style="margin:0 0 5px;font-size:22px;line-height:1;">📦</p>
                                <p style="margin:0 0 2px;font-size:11px;font-weight:700;
                                          color:#4A3F38;letter-spacing:0.3px;">Tracked shipping</p>
                                <p style="margin:0;font-size:10px;color:#A89080;">Ships in 5–7 days</p>
                              </td>
                              <td style="background:#E4D8CC;width:1px;padding:0;font-size:0;">&nbsp;</td>
                              <td align="center" style="padding:0 8px;width:33%;">
                                <p style="margin:0 0 5px;font-size:22px;line-height:1;">⭐</p>
                                <p style="margin:0 0 2px;font-size:11px;font-weight:700;
                                          color:#4A3F38;letter-spacing:0.3px;">100% guaranteed</p>
                                <p style="margin:0;font-size:10px;color:#A89080;">30-day satisfaction</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Help line -->
                      <tr>
                        <td style="background:#FAF7F3;padding:14px 40px 20px;text-align:center;">
                          <p style="margin:0;font-size:12px;color:#A89080;line-height:1.7;">
                            Questions? Reply to this email or write to&nbsp;
                            <a href="mailto:hello@tolif.com"
                               style="color:#C4622D;text-decoration:none;font-weight:600;">
                              hello@tolif.com
                            </a>
                          </p>
                        </td>
                      </tr>

                      <!-- ══ DARK FOOTER ══ -->
                      <tr>
                        <td style="background:#1A1714;padding:22px 40px;text-align:center;
                                   border-radius:0 0 20px 20px;">
                          <p style="margin:0 0 5px;font-size:9px;letter-spacing:4px;color:#F5E6D3;
                                    text-transform:uppercase;font-weight:500;">Tolif Portrait Studio</p>
                          <p style="margin:0;font-size:11px;color:#4A3F38;line-height:1.6;">
                            © 2026&nbsp;·&nbsp;You received this because you placed an order at&nbsp;
                            <a href="{siteUrl}" style="color:#7A6558;text-decoration:none;">
                              tolif.com
                            </a>
                          </p>
                        </td>
                      </tr>

                    </table>
                    <!-- /card -->

                  </td>
                </tr>
              </table>

            </body>
            </html>
            """;

        // ── Plain-text fallback ───────────────────────────────────────────────
        var cleanDelivery = deliveryNote
            .Replace("<strong>", "").Replace("</strong>", "");

        var plain = $"""
            ✓ Order Confirmed — {orderNumber}
            {orderDate}
            ────────────────────────────────────

            {(order.CustomerName is { Length: > 0 } n2 ? $"Hi {n2}," : "Hello,")}

            {cleanDelivery}

            ORDER SUMMARY
            ─────────────────────────────
            {string.Join("\n", order.Items.Select(i =>
                $"  {i.ProductVariant?.Product?.Name ?? "Portrait"}  " +
                $"{(i.UnitPrice == 0 ? "Free" : $"{i.Currency} {i.UnitPrice * i.Quantity:F2}")}"))}
            ─────────────────────────────
            TOTAL: {order.Currency} {order.TotalAmount:F2}

            View order & download portrait:
            {downloadUrl}

            ────────────────────────────────────
            Questions? Email hello@tolif.com

            © 2026 Tolif Portrait Studio · tolif.com
            """;

        await email.SendAsync(new EmailMessage(
            To:            order.CustomerEmail,
            Subject:       $"Your Tolif portrait is ready — {orderNumber}",
            HtmlBody:      html,
            PlainTextBody: plain
        ), ct);
    }

    public async Task SendAbandonmentEmailAsync(Order order, CancellationToken ct = default)
    {
        var siteUrl     = await settings.GetAsync("site.url", ct) ?? "https://tolif.com";
        var apiUrl      = await settings.GetAsync("api.url",  ct) ?? siteUrl;
        var orderNumber = OrderHelper.FormatNumber(order);
        var resumeUrl   = $"{siteUrl}/order/{order.AccessToken}";
        var newUrl      = $"{siteUrl}/create";
        var greeting    = order.CustomerName is { Length: > 0 } n ? $"Hi {n}," : "Hello,";

        var firstSession = order.Items
            .Select(i => i.PortraitSession)
            .FirstOrDefault(s => s?.WatermarkedPreviewKey != null);

        var portraitSection = firstSession is not null
            ? $"""
              <tr>
                <td style="background:#1A1714;padding:0;line-height:0;font-size:0;">
                  <img
                    src="{apiUrl}/api/portraits/{firstSession.Id}/preview"
                    alt="Your Tolif portrait"
                    width="600"
                    style="display:block;width:100%;max-width:600px;height:auto;object-fit:cover;max-height:360px;"
                  />
                </td>
              </tr>
              """
            : "";

        var html = $"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#F5F0EA;font-family:Georgia,'Times New Roman',serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EA;padding:40px 16px;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFEF9;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(26,23,20,0.12);">

                    <tr>
                      <td style="background:#1A1714;padding:28px 40px;text-align:center;">
                        <p style="margin:0;font-size:9px;letter-spacing:6px;color:#F5E6D3;text-transform:uppercase;font-weight:500;">Tolif Portrait Studio</p>
                      </td>
                    </tr>

                    {portraitSection}

                    <tr>
                      <td style="padding:40px 40px 32px;">
                        <p style="margin:0 0 8px;font-size:11px;letter-spacing:4px;color:#C4622D;text-transform:uppercase;font-weight:600;">Your portrait is waiting</p>
                        <h1 style="margin:0 0 20px;font-size:28px;font-weight:300;color:#1A1714;line-height:1.3;">{greeting}<br>You were so close!</h1>
                        <p style="margin:0 0 28px;font-size:14px;color:#5A4E46;line-height:1.7;">
                          You created a beautiful portrait but didn't complete your order.
                          Your portrait is still saved — pick up where you left off.
                        </p>

                        <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                          <tr>
                            <td style="background:#C4622D;border-radius:40px;">
                              <a href="{resumeUrl}" style="display:block;padding:14px 36px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:0.5px;white-space:nowrap;">
                                Complete my portrait →
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:0;font-size:12px;color:#A89080;text-align:center;line-height:1.6;">
                          Order ref: <span style="font-family:monospace;color:#8C7B6B;">{orderNumber}</span>
                          &nbsp;·&nbsp;
                          <a href="{newUrl}" style="color:#A89080;text-decoration:underline;">Start a new portrait instead</a>
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="background:#1A1714;padding:22px 40px;text-align:center;border-radius:0 0 20px 20px;">
                        <p style="margin:0 0 5px;font-size:9px;letter-spacing:4px;color:#F5E6D3;text-transform:uppercase;font-weight:500;">Tolif Portrait Studio</p>
                        <p style="margin:0;font-size:11px;color:#4A3F38;line-height:1.6;">
                          © 2026&nbsp;·&nbsp;<a href="{siteUrl}" style="color:#7A6558;text-decoration:none;">tolif.com</a>
                        </p>
                      </td>
                    </tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;

        var plain = $"""
            Your portrait is waiting — {orderNumber}

            {greeting} You were so close!

            You created a portrait but didn't complete your order.
            Your portrait is still saved — complete it here:
            {resumeUrl}

            Or start a new portrait:
            {newUrl}

            ────────────────────────────────────
            Questions? Email hello@tolif.com
            © 2026 Tolif Portrait Studio · tolif.com
            """;

        await email.SendAsync(new EmailMessage(
            To:            order.CustomerEmail,
            Subject:       $"Your portrait is waiting for you — {orderNumber}",
            HtmlBody:      html,
            PlainTextBody: plain
        ), ct);
    }
}
