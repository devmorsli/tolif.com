namespace Tolif.Application.Interfaces;

public interface IStorageService
{
    /// <summary>Generates a presigned PUT URL for client-side direct upload.</summary>
    Task<string> GenerateUploadUrlAsync(string key, string contentType, TimeSpan expiry, CancellationToken ct = default);

    /// <summary>Generates a presigned GET URL for reading a private file.</summary>
    Task<string> GenerateDownloadUrlAsync(string key, TimeSpan expiry, CancellationToken ct = default);

    /// <summary>Uploads a byte array (used server-side for watermarked previews, etc.).</summary>
    Task UploadAsync(string key, byte[] data, string contentType, CancellationToken ct = default);

    /// <summary>Downloads raw bytes from a key.</summary>
    Task<byte[]> DownloadAsync(string key, CancellationToken ct = default);

    /// <summary>Deletes a file from storage.</summary>
    Task DeleteAsync(string key, CancellationToken ct = default);

    /// <summary>Checks whether a key exists.</summary>
    Task<bool> ExistsAsync(string key, CancellationToken ct = default);
}
