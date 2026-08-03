<?php

declare(strict_types=1);

namespace Tests\Feature\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mock response factory for testing controllers without Laravel.
 *
 * Provides simple response helper functions similar to Laravel's response() helper.
 */
final class MockResponseFactory
{
    /**
     * Create a JSON response.
     *
     * @param mixed $data Data to encode as JSON.
     * @param int $status HTTP status code.
     * @return JsonResponse
     */
    public static function json($data = [], int $status = 200): JsonResponse
    {
        return new JsonResponse($data, $status);
    }

    /**
     * Create a no-content (204) response.
     *
     * @param int $status HTTP status code.
     * @return Response
     */
    public static function noContent(int $status = 204): Response
    {
        return new Response('', $status);
    }
}
