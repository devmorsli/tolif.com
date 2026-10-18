using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Tolif.Application.Interfaces;

namespace Tolif.Infrastructure.Storage;

public class S3StorageService : IStorageService
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucket;
    private readonly Uri? _publicEndpoint;

    public S3StorageService(IAmazonS3 s3, IConfiguration config)
    {
        _s3    = s3;
        _bucket = config["S3_BUCKET"] ?? config["MINIO_BUCKET"] ?? "tolif";

        // S3_PUBLIC_ENDPOINT (or MINIO_PUBLIC_ENDPOINT) is the URL browsers use to
        // reach MinIO/S3.  When running in Docker the SDK signs URLs with the
        // internal service name (e.g. http://minio:9000) which browsers cannot
        // resolve.  Set this to the externally reachable address so every
        // presigned URL returned to a client uses the right host.
        //
        // Example docker-compose / .env:
        //   S3_PUBLIC_ENDPOINT=https://storage.yourdomain.com
        //   S3_PUBLIC_ENDPOINT=http://YOUR_SERVER_IP:9000
        var raw = config["S3_PUBLIC_ENDPOINT"] ?? config["MINIO_PUBLIC_ENDPOINT"];
        if (!string.IsNullOrWhiteSpace(raw))
            _publicEndpoint = new Uri(raw.TrimEnd('/'));
    }

    // Rewrites scheme://internal-host:port → scheme://public-host:port on any
    // presigned URL before it leaves the API.
    private string RewritePublicUrl(string url)
    {
        if (_publicEndpoint is null) return url;
        var builder = new UriBuilder(url)
        {
            Scheme = _publicEndpoint.Scheme,
            Host   = _publicEndpoint.Host,
            Port   = _publicEndpoint.IsDefaultPort ? -1 : _publicEndpoint.Port,
        };
        return builder.Uri.AbsoluteUri;
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
        return await Task.FromResult(RewritePublicUrl(_s3.GetPreSignedURL(request)));
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
        return await Task.FromResult(RewritePublicUrl(_s3.GetPreSignedURL(request)));
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
