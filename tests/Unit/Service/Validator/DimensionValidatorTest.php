<?php

declare(strict_types=1);

namespace Tests\Unit\Service\Validator;

use App\Service\Validator\DimensionValidator;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Filesystem\Filesystem;

/**
 * Tests for DimensionValidator.
 *
 * Verifies file size validation (max 5 MB per AC-2).
 * Tests both valid sizes and rejection of oversized files.
 */
final class DimensionValidatorTest extends TestCase
{
    /**
     * @var DimensionValidator
     */
    private DimensionValidator $validator;

    /**
     * @var string Temporary directory for test files.
     */
    private string $tempDir;

    /**
     * @var Filesystem
     */
    private Filesystem $filesystem;

    protected function setUp(): void
    {
        $this->validator = new DimensionValidator();
        $this->filesystem = new Filesystem();
        $this->tempDir = sys_get_temp_dir() . '/dimension-tests-' . uniqid();
        $this->filesystem->mkdir($this->tempDir);
    }

    protected function tearDown(): void
    {
        if (is_dir($this->tempDir)) {
            $this->filesystem->remove($this->tempDir);
        }
    }

    /**
     * Test: DimensionValidator accepts 1 MB file.
     * AC-2: Validate file size (max 5 MB).
     */
    public function test_validator_accepts_1mb_file(): void
    {
        $filePath = $this->tempDir . '/test-1mb.jpg';
        $this->createFileWithSize($filePath, 1 * 1024 * 1024);  // 1 MB

        $this->assertTrue($this->validator->validate($filePath));
    }

    /**
     * Test: DimensionValidator accepts exactly 5 MB file (boundary).
     * AC-2: Validate file size (max 5 MB).
     */
    public function test_validator_accepts_5mb_boundary(): void
    {
        $filePath = $this->tempDir . '/test-5mb.jpg';
        $this->createFileWithSize($filePath, 5 * 1024 * 1024);  // 5 MB

        $this->assertTrue($this->validator->validate($filePath));
    }

    /**
     * Test: DimensionValidator rejects 5.1 MB file (just over boundary).
     * AC-2: Validate file size (max 5 MB).
     */
    public function test_validator_rejects_5_1mb_file(): void
    {
        $filePath = $this->tempDir . '/test-5_1mb.jpg';
        $this->createFileWithSize($filePath, (int) (5.1 * 1024 * 1024));  // 5.1 MB

        $this->assertFalse($this->validator->validate($filePath));
    }

    /**
     * Test: DimensionValidator rejects 10 MB file.
     * AC-2: Validate file size (max 5 MB).
     */
    public function test_validator_rejects_10mb_file(): void
    {
        $filePath = $this->tempDir . '/test-10mb.jpg';
        $this->createFileWithSize($filePath, 10 * 1024 * 1024);  // 10 MB

        $this->assertFalse($this->validator->validate($filePath));
    }

    /**
     * Test: DimensionValidator.validateBytes() accepts 1 MB.
     * Boundary: Direct byte validation.
     */
    public function test_validator_bytes_accepts_1mb(): void
    {
        $this->assertTrue($this->validator->validateBytes(1 * 1024 * 1024));
    }

    /**
     * Test: DimensionValidator.validateBytes() accepts exactly 5 MB.
     * Boundary: Direct byte validation.
     */
    public function test_validator_bytes_accepts_5mb_boundary(): void
    {
        $this->assertTrue($this->validator->validateBytes(5 * 1024 * 1024));
    }

    /**
     * Test: DimensionValidator.validateBytes() rejects 5.1 MB.
     * Boundary: Direct byte validation.
     */
    public function test_validator_bytes_rejects_5_1mb(): void
    {
        $this->assertFalse($this->validator->validateBytes((int) (5.1 * 1024 * 1024)));
    }

    /**
     * Test: DimensionValidator returns correct max size constant.
     */
    public function test_get_max_size_bytes_returns_correct_value(): void
    {
        $expected = 5 * 1024 * 1024;  // 5 MB
        $this->assertSame($expected, DimensionValidator::getMaxSizeBytes());
    }

    /**
     * Test: DimensionValidator throws RuntimeException for non-existent file.
     */
    public function test_validator_throws_on_nonexistent_file(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('File does not exist');

        $this->validator->validate('/nonexistent/path/file.jpg');
    }

    /**
     * Helper method to create a file of a specific size.
     *
     * @param string $filePath Path to create.
     * @param int $bytes Desired file size in bytes.
     */
    private function createFileWithSize(string $filePath, int $bytes): void
    {
        $handle = fopen($filePath, 'w');
        if ($handle === false) {
            throw new \RuntimeException("Cannot create file: {$filePath}");
        }

        try {
            // Write in 1 MB chunks to avoid memory issues.
            $chunkSize = 1024 * 1024;
            $chunk = str_repeat('A', $chunkSize);

            $remaining = $bytes;
            while ($remaining > 0) {
                $toWrite = min($chunkSize, $remaining);
                fwrite($handle, substr($chunk, 0, $toWrite));
                $remaining -= $toWrite;
            }
        } finally {
            fclose($handle);
        }
    }
}
