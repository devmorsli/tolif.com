using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Tolif.Application.Interfaces;

namespace Tolif.Infrastructure.Storage;

public class S3StorageService : IStorageService
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucket;

    public S3StorageService(IAmazonS3 s3, IConfiguration config)
    {
        _s3 = s3;
        _bucket = config["S3_BUCKET"] ?? config["MINIO_BUCKET"] ?? "tolif";
    }

    public async Task<string> GenerateUploadUrlAsync(string key, string contentType, TimeSpan expiry, CancellationToken ct = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = key,
            Verb = HttpVerb.PUT,
            ContentType = contentType,
            Expires = DateTime.UtcNow.Add(expiry)
        };
        return await Task.FromResult(_s3.GetPreSignedURL(request));
    }

    public async Task<string> GenerateDownloadUrlAsync(string key, TimeSpan expiry, CancellationToken ct = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.Add(expiry)
        };
        return await Task.FromResult(_s3.GetPreSignedURL(request));
    }

    public async Task UploadAsync(string key, byte[] data, string contentType, CancellationToken ct = default)
    {
        using var ms = new MemoryStream(data);
        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucket,
            Key = key,
            InputStream = ms,
            ContentType = contentType
        }, ct);
    }

    public async Task<byte[]> DownloadAsync(string key, CancellationToken ct = default)
    {
        using var response = await _s3.GetObjectAsync(_bucket, key, ct);
        using var ms = new MemoryStream();
        await response.ResponseStream.CopyToAsync(ms, ct);
        return ms.ToArray();
    }

    public async Task DeleteAsync(string key, CancellationToken ct = default)
    {
        await _s3.DeleteObjectAsync(_bucket, key, ct);
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
    {
        try
        {
            await _s3.GetObjectMetadataAsync(_bucket, key, ct);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }
}
