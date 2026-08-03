<?php

declare(strict_types=1);

namespace App\Service\Validator;

/**
 * Validates file format using magic bytes (not MIME type or extension).
 *
 * Magic bytes are the first few bytes of a file that uniquely identify its format,
 * independent of file extension. This validator reads the first 4 bytes and checks
 * them against known signatures for JPEG and PNG.
 *
 * Prevents: extension/content mismatch attacks, MIME type spoofing.
 */
class MagicByteValidator
{
    /**
     * Supported file format magic byte signatures.
     *
     * @var array<string, array<int>>
     */
    private const MAGIC_BYTES = [
        'jpg' => [0xFF, 0xD8, 0xFF],  // JPEG Start of Image marker
        'png' => [0x89, 0x50, 0x4E, 0x47],  // PNG signature
    ];

    /**
     * Validate a file by reading its magic bytes.
     *
     * Opens the file, reads the first 4 bytes, and checks if they match
     * the signature for JPEG or PNG. Returns false for any other format.
     *
     * @param string $filePath Absolute path to the uploaded file.
     * @return bool True if file matches a supported format, false otherwise.
     * @throws \RuntimeException If file cannot be read.
     */
    public function validate(string $filePath): bool
    {
        if (! is_file($filePath) || ! is_readable($filePath)) {
            throw new \RuntimeException("File not readable: {$filePath}");
        }

        $handle = fopen($filePath, 'rb');
        if ($handle === false) {
            throw new \RuntimeException("Cannot open file: {$filePath}");
        }

        try {
            $bytes = fread($handle, 4);
            if ($bytes === false) {
                return false;
            }

            $bytesArray = array_values(unpack('C*', $bytes));

            foreach (self::MAGIC_BYTES as $ext => $magicSignature) {
                if ($this->matchesSignature($bytesArray, $magicSignature)) {
                    return true;
                }
            }

            return false;
        } finally {
            fclose($handle);
        }
    }

    /**
     * Determine file extension from magic bytes.
     *
     * Reads the file's magic bytes and returns the corresponding extension
     * (jpg or png) if they match a known format, or null otherwise.
     *
     * @param string $filePath Absolute path to the file.
     * @return string|null Extension (jpg or png) or null if format not recognized.
     * @throws \RuntimeException If file cannot be read.
     */
    public function getExtensionFromMagic(string $filePath): ?string
    {
        if (! is_file($filePath) || ! is_readable($filePath)) {
            throw new \RuntimeException("File not readable: {$filePath}");
        }

        $handle = fopen($filePath, 'rb');
        if ($handle === false) {
            throw new \RuntimeException("Cannot open file: {$filePath}");
        }

        try {
            $bytes = fread($handle, 4);
            if ($bytes === false) {
                return null;
            }

            $bytesArray = array_values(unpack('C*', $bytes));

            foreach (self::MAGIC_BYTES as $ext => $magicSignature) {
                if ($this->matchesSignature($bytesArray, $magicSignature)) {
                    return $ext;
                }
            }

            return null;
        } finally {
            fclose($handle);
        }
    }

    /**
     * Check if a byte array matches a magic signature.
     *
     * Compares the first N bytes of the input with the signature,
     * where N is the length of the signature.
     *
     * @param array<int> $fileBytes Bytes read from file.
     * @param array<int> $signature Expected magic signature.
     * @return bool True if bytes match signature.
     */
    private function matchesSignature(array $fileBytes, array $signature): bool
    {
        if (count($fileBytes) < count($signature)) {
            return false;
        }

        for ($i = 0; $i < count($signature); $i++) {
            if ($fileBytes[$i] !== $signature[$i]) {
                return false;
            }
        }

        return true;
    }
}
