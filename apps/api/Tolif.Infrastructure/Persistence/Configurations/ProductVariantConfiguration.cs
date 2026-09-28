using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tolif.Domain.Entities;

namespace Tolif.Infrastructure.Persistence.Configurations;

public class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Price).HasColumnType("numeric(10,2)");
        builder.Property(v => v.Currency).HasMaxLength(3);
        builder.Property(v => v.Size).HasMaxLength(50);
        builder.HasOne(v => v.Product).WithMany(p => p.Variants)
            .HasForeignKey(v => v.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}
