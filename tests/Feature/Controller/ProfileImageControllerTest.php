<?php

declare(strict_types=1);

namespace Tests\Feature\Controller;

use App\Controller\ProfileImageController;
use App\Service\AuthService;
use App\Service\ProfileImageService;
use App\Service\SymfonyResponseFactory;
use App\Service\ValidationException;
use App\Service\Adapter\S3Exception;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Filesystem\Filesystem;
use Mockery;
use Mockery\MockInterface;

/**
 * Feature tests for ProfileImageController.
 *
 * Tests HTTP endpoint behavior: status codes, response format, auth checks.
 */
final class ProfileImageControllerTest extends TestCase
{
    /**
     * @var ProfileImageController
     */
    private ProfileImageController $controller;

    /**
     * @var MockInterface Mock auth service.
     */
    private MockInterface $mockAuthService;

    /**
     * @var MockInterface Mock service.
     */
    private MockInterface $mockService;

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
        $this->mockAuthService = Mockery::mock(AuthService::class);
        $this->mockService = Mockery::mock(ProfileImageService::class);
        $responseFactory = new SymfonyResponseFactory();
        $this->controller = new ProfileImageController(
            $this->mockAuthService,
            $responseFactory,
            $this->mockService
        );

        $this->filesystem = new Filesystem();
        $this->tempDir = sys_get_temp_dir() . '/profile-image-controller-tests-' . uniqid();
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

        Mockery::close();
    }

    /**
     * Test: POST /users/{userId}/profile-image returns 200 on success.
     * AC-3: Upload returns 200 with URL and timestamp.
     */
    public function test_post_profile_image_returns_200_on_success(): void
    {
        // Setup: mock auth.
        $this->mockAuth(42);

        // Setup: mock request with file.
        $request = $this->createRequest(['image' => $this->createTestFile()]);

        // Setup: mock service to succeed.
        $this->mockService->shouldReceive('uploadImage')
            ->once()
            ->andReturn([
                'profile_image_url' => 'https://bucket.s3.amazonaws.com/users/42/profile.jpg?X-Amz-Signature=...',
                'profile_image_updated_at' => '2026-07-31T12:00:00Z',
            ]);

        // Act: POST.
        $response = $this->controller->store($request, 42);

        // Assert: 200 OK.
        $this->assertSame(200, $response->getStatusCode());

        // Assert: JSON response with URL and timestamp.
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('profile_image_url', $data);
        $this->assertArrayHasKey('profile_image_updated_at', $data);
        $this->assertStringContainsString('profile.jpg', $data['profile_image_url']);
    }

    /**
     * Test: POST without JWT returns 401.
     * AC-3: Auth required.
     */
    public function test_post_profile_image_returns_401_no_auth(): void
    {
        // Setup: no auth.
        $this->mockAuth(null);

        // Setup: mock request.
        $request = $this->createRequest(['image' => $this->createTestFile()]);

        // Act: POST.
        $response = $this->controller->store($request, 42);

        // Assert: 401 Unauthorized.
        $this->assertSame(401, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
        $this->assertStringContainsString('Unauthorized', $data['error']);
    }

    /**
     * Test: POST with caller != path user returns 403.
     * AC-3: Authorization check.
     */
    public function test_post_profile_image_returns_403_user_mismatch(): void
    {
        // Setup: auth as user 99, but post to user 42.
        $this->mockAuth(99);

        // Setup: mock request.
        $request = $this->createRequest(['image' => $this->createTestFile()]);

        // Act: POST to user 42 as user 99.
        $response = $this->controller->store($request, 42);

        // Assert: 403 Forbidden.
        $this->assertSame(403, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
        $this->assertStringContainsString('Forbidden', $data['error']);
    }

    /**
     * Test: POST without image field returns 422.
     * AC-1/AC-2: Validation error.
     */
    public function test_post_profile_image_returns_422_missing_file(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request without 'image' field.
        $request = $this->createRequest([]);

        // Act: POST.
        $response = $this->controller->store($request, 42);

        // Assert: 422 Unprocessable Entity.
        $this->assertSame(422, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
        $this->assertStringContainsString('Missing file field', $data['error']);
    }

    /**
     * Test: POST with invalid (corrupt) uploaded file returns 400.
     * Boundary: Invalid upload object.
     */
    public function test_post_profile_image_returns_400_invalid_upload(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: mock request with invalid file (isValid() returns false).
        $invalidFile = Mockery::mock('Symfony\Component\HttpFoundation\File\UploadedFile');
        $invalidFile->shouldReceive('isValid')->andReturn(false);

        $request = $this->createRequest(['image' => $invalidFile]);

        // Act: POST.
        $response = $this->controller->store($request, 42);

        // Assert: 400 Bad Request.
        $this->assertSame(400, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('invalid', strtolower($data['error']));
    }

    /**
     * Test: POST with invalid format returns 422.
     * AC-1: Format validation failure.
     */
    public function test_post_profile_image_returns_422_invalid_format(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request with file.
        $request = $this->createRequest(['image' => $this->createTestFile()]);

        // Setup: service throws ValidationException (format).
        $this->mockService->shouldReceive('uploadImage')
            ->once()
            ->andThrow(new ValidationException('Only JPG and PNG are allowed'));

        // Act: POST.
        $response = $this->controller->store($request, 42);

        // Assert: 422 Unprocessable Entity.
        $this->assertSame(422, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
        $this->assertStringContainsString('JPG and PNG', $data['error']);
    }

    /**
     * Test: POST with oversized file returns 422.
     * AC-2: Size validation failure.
     */
    public function test_post_profile_image_returns_422_oversized_file(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request with file.
        $request = $this->createRequest(['image' => $this->createTestFile()]);

        // Setup: service throws ValidationException (size).
        $this->mockService->shouldReceive('uploadImage')
            ->once()
            ->andThrow(new ValidationException('File size exceeds maximum of 5 MB'));

        // Act: POST.
        $response = $this->controller->store($request, 42);

        // Assert: 422 Unprocessable Entity.
        $this->assertSame(422, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('5 MB', $data['error']);
    }

    /**
     * Test: POST with database error returns 500.
     * Boundary: Database write failure.
     */
    public function test_post_profile_image_returns_500_db_error(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request with file.
        $request = $this->createRequest(['image' => $this->createTestFile()]);

        // Setup: service throws generic exception (DB error).
        $this->mockService->shouldReceive('uploadImage')
            ->once()
            ->andThrow(new \RuntimeException('Database connection failed'));

        // Act: POST.
        $response = $this->controller->store($request, 42);

        // Assert: 500 Internal Server Error.
        $this->assertSame(500, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('Internal server error', $data['error']);
    }

    /**
     * Test: POST with S3 error returns 502.
     * AC-3: S3 failure.
     */
    public function test_post_profile_image_returns_502_s3_error(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request with file.
        $request = $this->createRequest(['image' => $this->createTestFile()]);

        // Setup: service throws S3Exception.
        $this->mockService->shouldReceive('uploadImage')
            ->once()
            ->andThrow(new S3Exception('S3 service unavailable'));

        // Act: POST.
        $response = $this->controller->store($request, 42);

        // Assert: 502 Bad Gateway.
        $this->assertSame(502, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('S3 upload failed', $data['error']);
    }

    /**
     * Test: DELETE /users/{userId}/profile-image returns 204 on success.
     * AC-5: Delete returns 204.
     */
    public function test_delete_profile_image_returns_204_on_success(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request.
        $request = $this->createRequest([]);

        // Setup: service succeeds.
        $this->mockService->shouldReceive('deleteImage')
            ->once();

        // Act: DELETE.
        $response = $this->controller->destroy($request, 42);

        // Assert: 204 No Content.
        $this->assertSame(204, $response->getStatusCode());

        // Assert: no body.
        $this->assertEmpty($response->getContent());
    }

    /**
     * Test: DELETE without auth returns 401.
     */
    public function test_delete_profile_image_returns_401_no_auth(): void
    {
        // Setup: no auth.
        $this->mockAuth(null);

        // Setup: request.
        $request = $this->createRequest([]);

        // Act: DELETE.
        $response = $this->controller->destroy($request, 42);

        // Assert: 401 Unauthorized.
        $this->assertSame(401, $response->getStatusCode());
    }

    /**
     * Test: DELETE with database error returns 500.
     * Boundary: Database delete failure.
     */
    public function test_delete_profile_image_returns_500_db_error(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request.
        $request = $this->createRequest([]);

        // Setup: service throws DB error.
        $this->mockService->shouldReceive('deleteImage')
            ->once()
            ->andThrow(new \RuntimeException('Database connection failed'));

        // Act: DELETE.
        $response = $this->controller->destroy($request, 42);

        // Assert: 500 Internal Server Error.
        $this->assertSame(500, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('Internal server error', $data['error']);
    }

    /**
     * Test: DELETE with user mismatch returns 403.
     */
    public function test_delete_profile_image_returns_403_user_mismatch(): void
    {
        // Setup: auth as user 99.
        $this->mockAuth(99);

        // Setup: request.
        $request = $this->createRequest([]);

        // Act: DELETE user 42 as user 99.
        $response = $this->controller->destroy($request, 42);

        // Assert: 403 Forbidden.
        $this->assertSame(403, $response->getStatusCode());
    }

    /**
     * Test: GET /users/{userId}/profile-image returns 200 with URL.
     * AC-3: GET returns presigned URL.
     */
    public function test_get_profile_image_returns_200_with_url(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request.
        $request = $this->createRequest([]);

        // Setup: service returns URL.
        $this->mockService->shouldReceive('getPresignedUrl')
            ->once()
            ->andReturn('https://bucket.s3.amazonaws.com/users/42/profile.jpg?X-Amz-Signature=...');

        // Act: GET.
        $response = $this->controller->show($request, 42);

        // Assert: 200 OK.
        $this->assertSame(200, $response->getStatusCode());

        // Assert: JSON response with URL.
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('profile_image_url', $data);
        $this->assertStringContainsString('profile.jpg', $data['profile_image_url']);
    }

    /**
     * Test: GET with no image returns 404.
     */
    public function test_get_profile_image_returns_404_no_image(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request.
        $request = $this->createRequest([]);

        // Setup: service returns null (no image).
        $this->mockService->shouldReceive('getPresignedUrl')
            ->once()
            ->andReturn(null);

        // Act: GET.
        $response = $this->controller->show($request, 42);

        // Assert: 404 Not Found.
        $this->assertSame(404, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('No profile image found', $data['error']);
    }

    /**
     * Test: GET with user mismatch returns 403.
     */
    public function test_get_profile_image_returns_403_user_mismatch(): void
    {
        // Setup: auth as user 99.
        $this->mockAuth(99);

        // Setup: request.
        $request = $this->createRequest([]);

        // Act: GET user 42 as user 99.
        $response = $this->controller->show($request, 42);

        // Assert: 403 Forbidden.
        $this->assertSame(403, $response->getStatusCode());
    }

    /**
     * Test: GET with database error returns 500.
     */
    public function test_get_profile_image_returns_500_db_error(): void
    {
        // Setup: auth.
        $this->mockAuth(42);

        // Setup: request.
        $request = $this->createRequest([]);

        // Setup: service throws DB error.
        $this->mockService->shouldReceive('getPresignedUrl')
            ->once()
            ->andThrow(new \RuntimeException('Database connection failed'));

        // Act: GET.
        $response = $this->controller->show($request, 42);

        // Assert: 500 Internal Server Error.
        $this->assertSame(500, $response->getStatusCode());

        // Assert: error message.
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('Internal server error', $data['error']);
    }

    /**
     * Test: GET without auth returns 401.
     */
    public function test_get_profile_image_returns_401_no_auth(): void
    {
        // Setup: no auth.
        $this->mockAuth(null);

        // Setup: request.
        $request = $this->createRequest([]);

        // Act: GET.
        $response = $this->controller->show($request, 42);

        // Assert: 401 Unauthorized.
        $this->assertSame(401, $response->getStatusCode());
    }

    /**
     * Helper to mock AuthService::check and AuthService::id.
     *
     * @param int|null $userId Authenticated user ID, or null if not authenticated.
     */
    private function mockAuth(?int $userId): void
    {
        if ($userId !== null) {
            $this->mockAuthService->shouldReceive('check')->andReturn(true);
            $this->mockAuthService->shouldReceive('id')->andReturn($userId);
        } else {
            $this->mockAuthService->shouldReceive('check')->andReturn(false);
            $this->mockAuthService->shouldReceive('id')->andReturn(null);
        }
    }

    /**
     * Helper to create a mock Request with files.
     *
     * @param array $files Files keyed by form field name.
     * @return MockInterface
     */
    private function createRequest(array $files = []): MockInterface
    {
        $request = Mockery::mock('Symfony\Component\HttpFoundation\Request');

        // Setup hasFile method.
        $request->shouldReceive('hasFile')->andReturnUsing(function ($field) use ($files) {
            return isset($files[$field]);
        });

        // Setup file method.
        $request->shouldReceive('file')->andReturnUsing(function ($field) use ($files) {
            return $files[$field] ?? null;
        });

        return $request;
    }

    /**
     * Helper to create a test UploadedFile.
     *
     * @return UploadedFile
     */
    private function createTestFile(): UploadedFile
    {
        $filePath = $this->tempDir . '/test-' . uniqid() . '.jpg';
        file_put_contents($filePath, 'JPEG content');

        return new UploadedFile(
            $filePath,
            'test.jpg',
            'image/jpeg',
            null,
            true  // test mode
        );
    }
}
