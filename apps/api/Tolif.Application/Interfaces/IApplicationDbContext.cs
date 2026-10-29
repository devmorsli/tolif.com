using Microsoft.EntityFrameworkCore;
using Tolif.Domain.Entities;

namespace Tolif.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Template> Templates { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<PortraitSession> PortraitSessions { get; }
    DbSet<AiGenerationLog> AiGenerationLogs { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductVariant> ProductVariants { get; }
    DbSet<PrintOrder> PrintOrders { get; }
    DbSet<DiscountCode> DiscountCodes { get; }
    DbSet<Setting> Settings { get; }
    DbSet<AnalyticsEvent> AnalyticsEvents { get; }
    DbSet<Review> Reviews { get; }
    DbSet<DigitalProduct> DigitalProducts { get; }
    DbSet<DigitalProductTier> DigitalProductTiers { get; }
    DbSet<DigitalFile> DigitalFiles { get; }
    DbSet<DigitalOrder> DigitalOrders { get; }
    DbSet<DigitalDownloadToken> DigitalDownloadTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
