<?php

declare(strict_types=1);

namespace App\Service\Validator;

/**
 * Validates file size constraints.
 *
 * Checks that uploaded files do not exceed the maximum allowed size (5 MB).
 * This validator runs before S3 upload to fail fast on oversized files.
 */
class DimensionValidator
{
    /**
     * Maximum file size in bytes: 5 MB.
     *
     * @var int
     */
    private const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;  // 5 MB

    /**
     * Validate file size from filesystem.
     *
     * Checks if the file at the given path does not exceed the maximum size.
     *
     * @param string $filePath Absolute path to the uploaded file.
     * @return bool True if file size is within limits, false otherwise.
     * @throws \RuntimeException If file cannot be stat'd.
     */
    public function validate(string $filePath): bool
    {
        if (! is_file($filePath)) {
            throw new \RuntimeException("File does not exist: {$filePath}");
        }

        $fileSize = filesize($filePath);
        if ($fileSize === false) {
            throw new \RuntimeException("Cannot read file size: {$filePath}");
        }

        return $this->validateBytes($fileSize);
    }

    /**
     * Validate file size by byte count.
     *
     * @param int $bytes File size in bytes.
     * @return bool True if within limits, false otherwise.
     */
    public function validateBytes(int $bytes): bool
    {
        return $bytes <= self::MAX_FILE_SIZE_BYTES;
    }

    /**
     * Get the maximum allowed file size in bytes.
     *
     * @return int
     */
    public static function getMaxSizeBytes(): int
    {
        return self::MAX_FILE_SIZE_BYTES;
    }
}
