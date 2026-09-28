using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tolif.Domain.Entities;

namespace Tolif.Infrastructure.Persistence.Configurations;

public class TemplateConfiguration : IEntityTypeConfiguration<Template>
{
    public void Configure(EntityTypeBuilder<Template> builder)
    {
        builder.HasKey(t => t.Id);
        builder.HasIndex(t => t.Slug).IsUnique();
        builder.Property(t => t.Slug).HasMaxLength(200).IsRequired();
        builder.Property(t => t.Name).HasMaxLength(200).IsRequired();
        builder.Property(t => t.Category).HasMaxLength(100).IsRequired();
        builder.Property(t => t.Prompt).HasColumnType("text").IsRequired();
        builder.Property(t => t.UploadSlotsJson).HasColumnType("jsonb").HasDefaultValue("[]");
        builder.Property(t => t.SeoTitle).HasMaxLength(160);
        builder.Property(t => t.SeoDescription).HasMaxLength(320);
    }
}
