using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext db,
        UserManager<AdminUser> userManager,
        RoleManager<IdentityRole> roleManager,
        string adminEmail,
        string adminPassword)
    {
        await db.Database.MigrateAsync();

        // ── Roles ──────────────────────────────────────────────────────────
        foreach (var role in new[] { "Admin", "Staff" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // ── Admin user ─────────────────────────────────────────────────────
        var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
        if (existingAdmin is null)
        {
            var admin = new AdminUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                DisplayName = "Admin",
                Role = "Admin",
                EmailConfirmed = true
            };
            await userManager.CreateAsync(admin, adminPassword);
            await userManager.AddToRoleAsync(admin, "Admin");
        }
        else
        {
            // Ensure password stays in sync with the configured ADMIN_PASSWORD
            var token = await userManager.GeneratePasswordResetTokenAsync(existingAdmin);
            await userManager.ResetPasswordAsync(existingAdmin, token, adminPassword);
            if (!await userManager.IsInRoleAsync(existingAdmin, "Admin"))
                await userManager.AddToRoleAsync(existingAdmin, "Admin");
        }

        // ── Default settings ───────────────────────────────────────────────
        await UpsertSettingAsync(db, "store.name", "Tolif");
        await UpsertSettingAsync(db, "store.currency.default", "EUR");
        await UpsertSettingAsync(db, "store.currencies.supported", "EUR,USD,GBP,CAD,AUD");
        await UpsertSettingAsync(db, "ai.provider.active", "Gemini");
        await UpsertSettingAsync(db, "ai.provider.fallback_order", "Gemini,FalAi,OpenAi");
        await UpsertSettingAsync(db, "ai.preview.regen_limit", "5");
        await UpsertSettingAsync(db, "ai.preview.regen_limit_enabled", "true");
        await UpsertSettingAsync(db, "regen.enabled", "true");
        await UpsertSettingAsync(db, "regen.maxPerSession", "5");
        await UpsertSettingAsync(db, "store.maintenance.enabled", "false");
        await UpsertSettingAsync(db, "store.maintenance.password", "");
        await UpsertSettingAsync(db, "store.maintenance.message", "We're currently doing some maintenance. We'll be back shortly!");
        await UpsertSettingAsync(db, "gdpr.photo_retention_days_paid", "30");
        await UpsertSettingAsync(db, "gdpr.photo_retention_days_abandoned", "7");
        await UpsertSettingAsync(db, "store.language.default", "en");
        await UpsertSettingAsync(db, "store.languages.supported", "en");
        await UpsertSettingAsync(db, "print.provider.active", "Printful");
        await UpsertSettingAsync(db, "email.provider",     "smtp");
        await UpsertSettingAsync(db, "email.fromAddress",  "noreply@tolif.com");
        await UpsertSettingAsync(db, "email.fromName",     "Tolif");
        await UpsertSettingAsync(db, "resend.apiKey",      "");

        // ── Products ───────────────────────────────────────────────────────
        if (!await db.Products.AnyAsync())
        {
            var digital = new Product { Name = "Digital Download", Type = ProductType.Digital, SortOrder = 0 };
            var poster  = new Product { Name = "Poster Print",     Type = ProductType.Poster,  SortOrder = 1 };
            var framed  = new Product { Name = "Framed Print",     Type = ProductType.FramedPrint, SortOrder = 2 };
            var canvas  = new Product { Name = "Canvas",           Type = ProductType.Canvas,  SortOrder = 3 };

            db.Products.AddRange(digital, poster, framed, canvas);
        }

        // ── Sync variants to match storefront prices/sizes (runs on every startup) ─
        // Sizes mirror the frontend SIZES array: 12×16 in = 30 × 40 cm,
        //   18×24 in = 45 × 60 cm, 24×36 in = 60 × 90 cm.
        // Prices mirror the frontend POSTER_BASE / CANVAS_BASE / FRAME_ADDON / DIGITAL_PRICE.
        await SyncVariantsAsync(db, ProductType.Digital, [
            ("Digital (High-Res PNG)", 49m, "USD"),
        ]);
        await SyncVariantsAsync(db, ProductType.Poster, [
            ("30 × 40 cm",  49m, "USD"),
            ("45 × 60 cm",  69m, "USD"),
            ("60 × 90 cm",  99m, "USD"),
        ]);
        await SyncVariantsAsync(db, ProductType.FramedPrint, [
            ("30 × 40 cm",  99m, "USD"),
            ("45 × 60 cm", 119m, "USD"),
            ("60 × 90 cm", 149m, "USD"),
        ]);
        await SyncVariantsAsync(db, ProductType.Canvas, [
            ("30 × 40 cm",  69m, "USD"),
            ("45 × 60 cm",  99m, "USD"),
            ("60 × 90 cm", 149m, "USD"),
        ]);

        // ── Templates (6 across categories) ───────────────────────────────
        if (!await db.Templates.AnyAsync())
        {
            db.Templates.AddRange(
                MakeTemplate("woman-with-dog",
                    "Woman with Dog",
                    "Dogs",
                    "Recreate the template portrait exactly — same pose, warm studio lighting, painterly oil style — but replace the woman with the person from photo 2 and the dog with the dog from photo 3. Keep all other details identical.",
                    """[{"name":"template","label":"Template","type":"template","required":true},{"name":"person","label":"Your photo","type":"person","required":true},{"name":"pet","label":"Your dog's photo","type":"pet","required":true}]""",
                    0),
                MakeTemplate("man-with-cat",
                    "Man with Cat",
                    "Cats",
                    "Recreate the template portrait exactly — same pose, cosy indoor lighting, impressionist style — but replace the man with the person from photo 2 and the cat with the cat from photo 3.",
                    """[{"name":"person","label":"Your photo","type":"person","required":true},{"name":"pet","label":"Your cat's photo","type":"pet","required":true}]""",
                    1),
                MakeTemplate("couple-with-dog",
                    "Couple with Dog",
                    "Couple & Pet",
                    "Recreate the template portrait exactly — same outdoor meadow setting and golden-hour lighting — but replace person 1 with photo 2, person 2 with photo 3, and the dog with photo 4.",
                    """[{"name":"person1","label":"Person 1 photo","type":"person","required":true},{"name":"person2","label":"Person 2 photo","type":"person","required":true},{"name":"pet","label":"Your dog's photo","type":"pet","required":true}]""",
                    2),
                MakeTemplate("woman-with-cat",
                    "Woman with Cat",
                    "Cats",
                    "Recreate the template portrait exactly — same cosy armchair setting, soft morning light, watercolour art style — but replace the woman with the person from photo 2 and the cat with the cat from photo 3.",
                    """[{"name":"person","label":"Your photo","type":"person","required":true},{"name":"pet","label":"Your cat's photo","type":"pet","required":true}]""",
                    3),
                MakeTemplate("multiple-pets",
                    "Person with Multiple Pets",
                    "Multiple Pets",
                    "Recreate the template portrait exactly — same vibrant living room, playful digital art style — but replace the person with photo 2, pet 1 with photo 3, and pet 2 with photo 4.",
                    """[{"name":"person","label":"Your photo","type":"person","required":true},{"name":"pet1","label":"Pet 1 photo","type":"pet","required":true},{"name":"pet2","label":"Pet 2 photo","type":"pet","required":true}]""",
                    4),
                MakeTemplate("man-with-dog",
                    "Man with Dog",
                    "Dogs",
                    "Recreate the template portrait exactly — same outdoor park setting, natural sunlight, realistic oil painting style — but replace the man with the person from photo 2 and the dog with the dog from photo 3.",
                    """[{"name":"person","label":"Your photo","type":"person","required":true},{"name":"pet","label":"Your dog's photo","type":"pet","required":true}]""",
                    5)
            );
        }

        // ── Reviews ────────────────────────────────────────────────────────────
        if (!await db.Reviews.AnyAsync())
        {
            db.Reviews.AddRange(
                new Review
                {
                    Name      = "Sophie M.",
                    Location  = "Amsterdam, NL",
                    Subject   = "Family Portrait",
                    Rating    = 5,
                    Text      = "I ordered the family portrait as a birthday gift for my mum and she cried when she saw it. The likeness is incredible — it looks like an actual oil painting. Already ordering one for myself!",
                    Product   = "Framed Print 50×70cm",
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-14)
                },
                new Review
                {
                    Name      = "Marco R.",
                    Location  = "Milan, IT",
                    Subject   = "Couple Portrait",
                    Rating    = 5,
                    Text      = "I was skeptical about AI portraits, but this is genuinely beautiful. The style, the colours, the way they captured our expressions — my girlfriend and I are blown away. Perfect anniversary gift.",
                    Product   = "Canvas 30×40cm",
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                new Review
                {
                    Name      = "Emma L.",
                    Location  = "London, UK",
                    Subject   = "Best Friends",
                    Rating    = 5,
                    Text      = "Ordered the best friends watercolour template for me and my two sisters. The preview came back in minutes and it was already stunning. Hung it in the living room and everyone asks about it.",
                    Product   = "Digital + Poster",
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-21)
                },
                new Review
                {
                    Name      = "Lukas B.",
                    Location  = "Berlin, DE",
                    Subject   = "Solo Studio Portrait",
                    Rating    = 5,
                    Text      = "The quality of the high-res file is incredible. Printed it at A1 and it's absolutely sharp. Customer support was amazing when I needed a slight regeneration — no questions asked.",
                    Product   = "Digital Download",
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-5)
                }
            );
        }

        await db.SaveChangesAsync();
    }

    private static Template MakeTemplate(string slug, string name, string category, string prompt, string uploadSlots, int order) =>
        new()
        {
            Slug = slug,
            Name = name,
            Category = category,
            Prompt = prompt,
            UploadSlotsJson = uploadSlots,
            TemplateImageKey = $"templates/{slug}/template.jpg",
            SortOrder = order,
            SeoTitle = $"{name} AI Portrait | Tolif",
            SeoDescription = $"Turn your own photos into a beautiful {name.ToLower()} AI portrait. Upload your photos and get a stunning result in minutes.",
            IsActive = true
        };

    private static async Task UpsertSettingAsync(ApplicationDbContext db, string key, string value)
    {
        var existing = await db.Settings.FirstOrDefaultAsync(s => s.Key == key);
        if (existing is null)
            db.Settings.Add(new Setting { Key = key, Value = value });
    }

    /// <summary>
    /// Ensures the variants for a product type exactly match <paramref name="expected"/>.
    /// Removes variants not in the list, adds missing ones, updates prices on existing ones.
    /// Uses ExecuteDeleteAsync for removals (direct SQL, no change-tracker involvement) to
    /// avoid DbUpdateConcurrencyException when mixing deletes+updates in one SaveChanges.
    /// </summary>
    private static async Task SyncVariantsAsync(
        ApplicationDbContext db,
        ProductType type,
        (string Size, decimal Price, string Currency)[] expected)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Type == type);

        if (product is null) return;

        var expectedSizes = expected.Select(e => e.Size).ToHashSet();

        // Delete stale variants directly (bypasses change tracker → no concurrency token conflict)
        await db.ProductVariants
            .Where(v => v.ProductId == product.Id && !expectedSizes.Contains(v.Size))
            .ExecuteDeleteAsync();

        // Reload remaining variants fresh so the change tracker has clean state
        var existing = await db.ProductVariants
            .Where(v => v.ProductId == product.Id)
            .ToListAsync();

        foreach (var (size, price, currency) in expected)
        {
            var variant = existing.FirstOrDefault(v => v.Size == size);
            if (variant is null)
            {
                db.ProductVariants.Add(new ProductVariant
                {
                    ProductId = product.Id,
                    Size      = size,
                    Price     = price,
                    Currency  = currency,
                });
            }
            else
            {
                variant.Price    = price;
                variant.Currency = currency;
            }
        }
    }
}
