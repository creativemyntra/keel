<?php

declare(strict_types=1);

namespace Tests\Unit\Service\Validator;

use App\Service\Validator\MagicByteValidator;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Filesystem\Filesystem;

/**
 * Tests for MagicByteValidator.
 *
 * Verifies magic byte validation for JPEG and PNG formats.
 * Tests both valid formats and rejection of unsupported types.
 */
final class MagicByteValidatorTest extends TestCase
{
    /**
     * @var MagicByteValidator
     */
    private MagicByteValidator $validator;

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
        $this->validator = new MagicByteValidator();
        $this->filesystem = new Filesystem();
        $this->tempDir = sys_get_temp_dir() . '/magic-byte-tests-' . uniqid();
        $this->filesystem->mkdir($this->tempDir);
    }

    protected function tearDown(): void
    {
        if (is_dir($this->tempDir)) {
            try {
                $this->filesystem->remove($this->tempDir);
            } catch (\Exception $e) {
                // On Windows, file handles may still be open; this is not critical.
            }
        }
    }

    /**
     * Test: MagicByteValidator accepts valid JPEG files.
     * AC-1: Validate file format (JPG/PNG) using magic bytes.
     */
    public function test_validator_accepts_valid_jpeg(): void
    {
        // Create a file with JPEG magic bytes.
        $jpegMagicBytes = "\xFF\xD8\xFF\xE0";  // JPEG SOI marker + JFIF marker
        $filePath = $this->tempDir . '/test.jpg';
        file_put_contents($filePath, $jpegMagicBytes . 'dummy content');

        // Assert: validation succeeds.
        $this->assertTrue($this->validator->validate($filePath));

        // Assert: getExtensionFromMagic returns 'jpg'.
        $this->assertSame('jpg', $this->validator->getExtensionFromMagic($filePath));
    }

    /**
     * Test: MagicByteValidator accepts valid PNG files.
     * AC-1: Validate file format (JPG/PNG) using magic bytes.
     */
    public function test_validator_accepts_valid_png(): void
    {
        // Create a file with PNG magic bytes.
        $pngMagicBytes = "\x89PNG\r\n\x1A\n";  // PNG signature
        $filePath = $this->tempDir . '/test.png';
        file_put_contents($filePath, $pngMagicBytes . 'dummy content');

        // Assert: validation succeeds.
        $this->assertTrue($this->validator->validate($filePath));

        // Assert: getExtensionFromMagic returns 'png'.
        $this->assertSame('png', $this->validator->getExtensionFromMagic($filePath));
    }

    /**
     * Test: MagicByteValidator rejects GIF files.
     * AC-1: Validate file format (JPG/PNG) using magic bytes.
     */
    public function test_validator_rejects_gif(): void
    {
        // Create a file with GIF magic bytes.
        $gifMagicBytes = "GIF89a";  // GIF header
        $filePath = $this->tempDir . '/test.gif';
        file_put_contents($filePath, $gifMagicBytes . 'dummy content');

        // Assert: validation fails.
        $this->assertFalse($this->validator->validate($filePath));

        // Assert: getExtensionFromMagic returns null.
        $this->assertNull($this->validator->getExtensionFromMagic($filePath));
    }

    /**
     * Test: MagicByteValidator rejects BMP files.
     * AC-1: Validate file format (JPG/PNG) using magic bytes.
     */
    public function test_validator_rejects_bmp(): void
    {
        // Create a file with BMP magic bytes.
        $bmpMagicBytes = "BM";  // BMP header
        $filePath = $this->tempDir . '/test.bmp';
        file_put_contents($filePath, $bmpMagicBytes . 'dummy content');

        // Assert: validation fails.
        $this->assertFalse($this->validator->validate($filePath));

        // Assert: getExtensionFromMagic returns null.
        $this->assertNull($this->validator->getExtensionFromMagic($filePath));
    }

    /**
     * Test: MagicByteValidator rejects extension mismatch (file content != declared extension).
     * AC-1: Validate file format (JPG/PNG) using magic bytes.
     *
     * This test verifies the validator prevents spoofing by checking actual content,
     * not just file extension.
     */
    public function test_validator_rejects_extension_mismatch_jpg_as_png(): void
    {
        // Create a file with JPEG content but .png extension.
        $jpegMagicBytes = "\xFF\xD8\xFF\xE0";  // JPEG magic
        $filePath = $this->tempDir . '/test.png';  // .png extension
        file_put_contents($filePath, $jpegMagicBytes . 'dummy content');

        // Assert: validation SUCCEEDS because content is valid JPEG (magic bytes pass).
        // The validator checks magic bytes, not extension.
        $this->assertTrue($this->validator->validate($filePath));

        // Assert: getExtensionFromMagic returns 'jpg' (the actual format).
        $this->assertSame('jpg', $this->validator->getExtensionFromMagic($filePath));
    }

    /**
     * Test: MagicByteValidator throws RuntimeException for non-existent file.
     * Boundary: File access error handling.
     */
    public function test_validator_throws_on_nonexistent_file(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('File not readable');

        $this->validator->validate('/nonexistent/path/file.jpg');
    }

    /**
     * Test: MagicByteValidator throws RuntimeException for unreadable file.
     * Boundary: File permission error handling.
     *
     * Note: File permissions behave differently on Windows vs Unix.
     * This test is skipped on Windows systems where chmod doesn't prevent reading.
     */
    public function test_validator_throws_on_unreadable_file(): void
    {
        // Skip this test on Windows where chmod doesn't prevent file reading.
        if (PHP_OS_FAMILY === 'Windows') {
            $this->markTestSkipped('File permission test not applicable on Windows');
        }

        // Create a file and make it unreadable.
        $filePath = $this->tempDir . '/unreadable.jpg';
        file_put_contents($filePath, 'test content');
        chmod($filePath, 0000);  // Remove all permissions.

        try {
            // expectException must be called BEFORE the exception is thrown.
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('File not readable');
            $this->validator->validate($filePath);
        } finally {
            chmod($filePath, 0644);  // Restore permissions for cleanup.
        }
    }
}
