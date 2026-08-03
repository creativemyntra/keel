<?php

declare(strict_types=1);

namespace App\Service\Adapter;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

/**
 * AWS S3 adapter for profile image operations.
 *
 * Handles low-level S3 interactions: uploading files, generating presigned URLs,
 * deleting objects. Uses AWS SDK v3.
 *
 * Configuration (environment variables):
 * - AWS_S3_BUCKET: S3 bucket name
 * - AWS_DEFAULT_REGION: AWS region (e.g., us-east-1)
 * - S3_URL_EXPIRY_SECONDS: Presigned URL TTL in seconds (default 3600)
 */
class S3Adapter
{
    /**
     * @var S3Client AWS S3 client instance.
     */
    private S3Client $client;

    /**
     * @var string S3 bucket name.
     */
    private string $bucket;

    /**
     * @var int Presigned URL expiration time in seconds.
     */
    private int $expirySeconds;

    /**
     * Initialize the S3 adapter.
     *
     * Reads AWS credentials from environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
     * or IAM role if running on EC2/ECS. S3 bucket name comes from AWS_S3_BUCKET env var.
     *
     * @param S3Client|null $client Optional mock S3Client for testing.
     * @throws \RuntimeException If required environment variables are missing.
     */
    public function __construct(?S3Client $client = null)
    {
        $bucket = getenv('AWS_S3_BUCKET');
        if ($bucket === false) {
            throw new \RuntimeException('Environment variable AWS_S3_BUCKET is not set');
        }

        $this->bucket = $bucket;
        $this->client = $client ?? new S3Client([
            'version' => 'latest',
            'region' => getenv('AWS_DEFAULT_REGION') ?: 'us-east-1',
        ]);

        $expirySeconds = getenv('S3_URL_EXPIRY_SECONDS');
        $this->expirySeconds = $expirySeconds !== false ? (int) $expirySeconds : 3600;
    }

    /**
     * Upload a file to S3.
     *
     * Reads the file from disk and uploads it to S3 with the given key.
     * Sets ACL to private and content type based on the file type.
     *
     * @param string $key S3 object key (e.g., users/42/profile.jpg).
     * @param string $filePath Absolute path to the file to upload.
     * @param string $contentType MIME type (e.g., image/jpeg).
     * @return string The S3 URI (s3://bucket/key).
     * @throws S3Exception On S3 error (network, permissions, quota).
     */
    public function putObject(string $key, string $filePath, string $contentType): string
    {
        if (! is_file($filePath) || ! is_readable($filePath)) {
            throw new \RuntimeException("File not readable: {$filePath}");
        }

        try {
            $this->client->putObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
                'Body' => fopen($filePath, 'r'),
                'ContentType' => $contentType,
                'ACL' => 'private',
                'ServerSideEncryption' => 'AES256',
            ]);

            return "s3://{$this->bucket}/{$key}";
        } catch (AwsException $e) {
            throw new S3Exception(
                "S3 PUT failed for key {$key}: " . $e->getMessage(),
                (int) $e->getCode(),
                $e
            );
        }
    }

    /**
     * Delete an object from S3.
     *
     * Attempts to delete the object at the given key. If deletion fails,
     * logs the orphan for async cleanup but does not throw (DB is authoritative).
     *
     * @param string $key S3 object key to delete.
     * @return bool True if deletion succeeded, false if object doesn't exist or error occurred.
     */
    public function deleteObject(string $key): bool
    {
        try {
            $this->client->deleteObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
            ]);

            return true;
        } catch (AwsException $e) {
            // Log orphan for async cleanup; don't throw (DB is authoritative).
            // In production, emit to a logging system or orphan queue.
            error_log("S3 DELETE orphan: key={$key}, error=" . $e->getMessage());

            return false;
        }
    }

    /**
     * Generate a presigned GET URL for an object.
     *
     * Creates a URL that allows temporary, unauthenticated access to a private
     * S3 object. The URL expires after the configured TTL (default 3600 seconds).
     *
     * @param string $key S3 object key.
     * @param int|null $expirySeconds Optional override for expiry time.
     * @return string Presigned URL.
     * @throws S3Exception On error.
     */
    public function getPresignedUrl(string $key, ?int $expirySeconds = null): string
    {
        $expiry = $expirySeconds ?? $this->expirySeconds;

        try {
            $cmd = $this->client->getCommand('GetObject', [
                'Bucket' => $this->bucket,
                'Key' => $key,
            ]);

            $request = $this->client->createPresignedRequest($cmd, "+{$expiry} seconds");
            return (string) $request->getUri();
        } catch (AwsException $e) {
            throw new S3Exception(
                "S3 presigned URL generation failed for key {$key}: " . $e->getMessage(),
                (int) $e->getCode(),
                $e
            );
        }
    }

    /**
     * Check if an object exists in S3.
     *
     * @param string $key S3 object key.
     * @return bool True if object exists, false otherwise.
     */
    public function objectExists(string $key): bool
    {
        return $this->client->doesObjectExist($this->bucket, $key);
    }
}

/**
 * Exception thrown by S3 operations.
 */
final class S3Exception extends \Exception
{
}
