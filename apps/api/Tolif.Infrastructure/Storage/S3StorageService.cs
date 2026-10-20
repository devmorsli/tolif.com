using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Tolif.Application.Interfaces;

namespace Tolif.Infrastructure.Storage;

public class S3StorageService : IStorageService
{
    private readonly IAmazonS3 _s3;       // internal endpoint — for actual API operations
    private readonly IAmazonS3 _s3Public; // public endpoint  — for signing presigned URLs
    private readonly string _bucket;

    public S3StorageService(IAmazonS3 s3, IConfiguration config)
    {
        _s3    = s3;
        _bucket = config["S3_BUCKET"] ?? config["MINIO_BUCKET"] ?? "tolif";

        // Presigned URLs must be signed with the same hostname that the client will
        // use to fetch the file.  If we sign with the internal Docker hostname
        // (e.g. http://minio:9000) but the client hits the public endpoint, MinIO
        // rejects the request because the `host` header is a signed header.
        //
        // Solution: create a second AmazonS3Client that uses the public endpoint as
        // its ServiceURL.  Presigned URLs are generated from that client so the
        // signature already covers the public hostname — no host rewriting needed.
        //
        // Set in .env:
        //   MINIO_PUBLIC_ENDPOINT=https://storage.yourdomain.com
        //   MINIO_PUBLIC_ENDPOINT=http://YOUR_SERVER_IP:9000
        var publicEndpoint = config["S3_PUBLIC_ENDPOINT"] ?? config["MINIO_PUBLIC_ENDPOINT"];
        if (!string.IsNullOrWhiteSpace(publicEndpoint))
        {
            var accessKey = config["S3_ACCESS_KEY"] ?? config["MINIO_ROOT_USER"] ?? "minioadmin";
            var secretKey = config["S3_SECRET_KEY"] ?? config["MINIO_ROOT_PASSWORD"] ?? "minioadmin";
            _s3Public = new AmazonS3Client(
                new BasicAWSCredentials(accessKey, secretKey),
                new AmazonS3Config { ServiceURL = publicEndpoint.TrimEnd('/'), ForcePathStyle = true });
        }
        else
        {
            _s3Public = s3; // no public endpoint configured — fall back to internal client
        }
    }

    public async Task<string> GenerateUploadUrlAsync(string key, string contentType, TimeSpan expiry, CancellationToken ct = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName  = _bucket,
            Key         = key,
            Verb        = HttpVerb.PUT,
            ContentType = contentType,
            Expires     = DateTime.UtcNow.Add(expiry)
        };
        // Use the public-endpoint client so the signed URL is valid for external callers.
        return await Task.FromResult(_s3Public.GetPreSignedURL(request));
    }

    public async Task<string> GenerateDownloadUrlAsync(string key, TimeSpan expiry, CancellationToken ct = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key        = key,
            Verb       = HttpVerb.GET,
            Expires    = DateTime.UtcNow.Add(expiry)
        };
        // Use the public-endpoint client so the signed URL is valid for external callers.
        return await Task.FromResult(_s3Public.GetPreSignedURL(request));
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
