namespace Tolif.Domain.Entities;

public class Review
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Location { get; set; } = "";
    public string? ProfilePhotoKey { get; set; }  // MinIO key
    public string Subject { get; set; } = "";
    public int Rating { get; set; } = 5;
    public string Text { get; set; } = "";
    public string? Product { get; set; }
    public string? MediaKey { get; set; }  // image or video MinIO key
    public bool IsVisible { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
