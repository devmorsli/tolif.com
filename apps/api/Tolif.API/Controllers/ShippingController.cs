using Microsoft.AspNetCore.Mvc;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/shipping-options")]
public class ShippingController(ISettingsService settings) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var standardLabel = await settings.GetAsync("shipping.standard.label", ct) ?? "Standard delivery";
        var standardDays  = await settings.GetAsync("shipping.standard.days",  ct) ?? "Ships in 5–7 business days";
        var standardRaw   = await settings.GetAsync("shipping.standard.price", ct) ?? "0";
        decimal.TryParse(standardRaw, System.Globalization.NumberStyles.Any,
                         System.Globalization.CultureInfo.InvariantCulture, out var standardPrice);

        var expressLabel = await settings.GetAsync("shipping.express.label", ct) ?? "Express delivery";
        var expressDays  = await settings.GetAsync("shipping.express.days",  ct) ?? "2–3 business days";
        var expressRaw   = await settings.GetAsync("shipping.express.price", ct) ?? "15";
        decimal.TryParse(expressRaw, System.Globalization.NumberStyles.Any,
                         System.Globalization.CultureInfo.InvariantCulture, out var expressPrice);

        return Ok(new object[]
        {
            new
            {
                id          = "standard",
                label       = standardLabel,
                description = standardDays,
                price       = standardPrice,
                currency    = "USD",
                badge       = (string?)null,
            },
            new
            {
                id          = "express",
                label       = expressLabel,
                description = expressDays,
                price       = expressPrice,
                currency    = "USD",
                badge       = "Fastest",
            },
        });
    }
}
