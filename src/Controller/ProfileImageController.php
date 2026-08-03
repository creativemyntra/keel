<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\AuthService;
use App\Service\ProfileImageService;
use App\Service\ResponseFactory;
use App\Service\ValidationException;
use App\Service\Adapter\S3Exception;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Controller for profile image endpoints.
 *
 * Handles HTTP requests for uploading, deleting, and retrieving user profile images.
 * All endpoints require authentication (Bearer JWT) and authorization (caller matches path user).
 *
 * Endpoints:
 * - POST /users/{userId}/profile-image — Upload image (multipart/form-data)
 * - DELETE /users/{userId}/profile-image — Delete image
 * - GET /users/{userId}/profile-image — Fetch presigned URL
 *
 * Error responses use constant-body contract (per KEEL convention):
 * plain-text body, X-Content-Type-Options: nosniff, Cache-Control: no-store.
 */
class ProfileImageController
{
    /**
     * @var AuthService
     */
    private AuthService $authService;

    /**
     * @var ResponseFactory
     */
    private ResponseFactory $responseFactory;

    /**
     * @var ProfileImageService
     */
    private ProfileImageService $service;

    /**
     * @param AuthService $authService Authentication service.
     * @param ResponseFactory $responseFactory HTTP response factory.
     * @param ProfileImageService $service Profile image service.
     */
    public function __construct(AuthService $authService, ResponseFactory $responseFactory, ProfileImageService $service)
    {
        $this->authService = $authService;
        $this->responseFactory = $responseFactory;
        $this->service = $service;
    }

    /**
     * Upload a profile image (POST /users/{userId}/profile-image).
     *
     * Expects a multipart/form-data request with a 'image' file field.
     * On success, returns 200 with the presigned URL and upload timestamp.
     * On validation error, returns 422 with error message.
     * On S3 error, returns 502.
     * On authorization error, returns 401/403.
     *
     * @param Request $request HTTP request.
     * @param int $userId User ID from path parameter.
     * @return JsonResponse
     */
    public function store(Request $request, int $userId): JsonResponse
    {
        // Authentication check (middleware assumed to have already verified JWT).
        if (! $this->authService->check()) {
            return $this->errorResponse('Unauthorized', 401);
        }

        // Authorization check: caller must match path user.
        if ($this->authService->id() !== $userId) {
            return $this->errorResponse('Forbidden', 403);
        }

        // Validate multipart request.
        if (! $request->hasFile('image')) {
            return $this->errorResponse('Missing file field: image', 422);
        }

        $file = $request->file('image');
        if (! $file->isValid()) {
            return $this->errorResponse('Uploaded file is invalid', 400);
        }

        // Attempt upload.
        try {
            $result = $this->service->uploadImage($userId, $file);

            return $this->responseFactory->json([
                'profile_image_url' => $result['profile_image_url'],
                'profile_image_updated_at' => $result['profile_image_updated_at'],
            ], 200);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (S3Exception $e) {
            return $this->errorResponse('S3 upload failed', 502);
        } catch (\Exception $e) {
            // DB error or other unexpected error.
            error_log("ProfileImageController::store error: " . $e->getMessage());

            return $this->errorResponse('Internal server error', 500);
        }
    }

    /**
     * Delete a profile image (DELETE /users/{userId}/profile-image).
     *
     * Idempotent: deleting a non-existent image returns 204.
     * Returns 204 No Content on success.
     * Returns 401/403 on authorization error.
     * Returns 502 if S3 deletion fails (DB is still updated; orphan logged).
     *
     * @param Request $request HTTP request.
     * @param int $userId User ID from path parameter.
     * @return Response
     */
    public function destroy(Request $request, int $userId): Response
    {
        // Authentication check.
        if (! $this->authService->check()) {
            return $this->errorResponse('Unauthorized', 401);
        }

        // Authorization check.
        if ($this->authService->id() !== $userId) {
            return $this->errorResponse('Forbidden', 403);
        }

        // Attempt deletion (idempotent).
        try {
            $this->service->deleteImage($userId);

            return $this->responseFactory->noContent(204);
        } catch (\Exception $e) {
            error_log("ProfileImageController::destroy error: " . $e->getMessage());

            return $this->errorResponse('Internal server error', 500);
        }
    }

    /**
     * Get profile image presigned URL (GET /users/{userId}/profile-image).
     *
     * Returns 200 with the presigned URL if the user has a profile image.
     * Returns 404 if no image exists.
     * Returns 401/403 on authorization error.
     *
     * @param Request $request HTTP request.
     * @param int $userId User ID from path parameter.
     * @return JsonResponse
     */
    public function show(Request $request, int $userId): JsonResponse
    {
        // Authentication check.
        if (! $this->authService->check()) {
            return $this->errorResponse('Unauthorized', 401);
        }

        // Authorization check.
        if ($this->authService->id() !== $userId) {
            return $this->errorResponse('Forbidden', 403);
        }

        try {
            $presignedUrl = $this->service->getPresignedUrl($userId);

            if ($presignedUrl === null) {
                return $this->errorResponse('No profile image found', 404);
            }

            return $this->responseFactory->json([
                'profile_image_url' => $presignedUrl,
            ], 200);
        } catch (\Exception $e) {
            error_log("ProfileImageController::show error: " . $e->getMessage());

            return $this->errorResponse('Internal server error', 500);
        }
    }

    /**
     * Generate an error response with constant body.
     *
     * Uses plain-text body per constant-body contract (KEEL convention KEEL-105).
     * Prevents MIME sniffing via X-Content-Type-Options: nosniff.
     * Prevents caching via Cache-Control: no-store.
     *
     * @param string $message Plain-text error message.
     * @param int $statusCode HTTP status code.
     * @return JsonResponse
     */
    private function errorResponse(string $message, int $statusCode): JsonResponse
    {
        $response = $this->responseFactory->json(['error' => $message], $statusCode);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }
}
