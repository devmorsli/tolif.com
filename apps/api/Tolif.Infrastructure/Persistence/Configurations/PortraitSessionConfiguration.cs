using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tolif.Domain.Entities;

namespace Tolif.Infrastructure.Persistence.Configurations;

public class PortraitSessionConfiguration : IEntityTypeConfiguration<PortraitSession>
{
    public void Configure(EntityTypeBuilder<PortraitSession> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.UploadedFilesJson).HasColumnType("jsonb").HasDefaultValue("{}");
        builder.Property(p => p.IpAddress).HasMaxLength(45);
        builder.HasOne(p => p.Template).WithMany(t => t.PortraitSessions)
            .HasForeignKey(p => p.TemplateId).OnDelete(DeleteBehavior.Restrict);
    }
}
