<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Symfony-based implementation of ResponseFactory.
 *
 * Uses Symfony HttpFoundation for response creation.
 * Can be swapped for mock implementations in tests.
 */
final class SymfonyResponseFactory implements ResponseFactory
{
    /**
     * Create a JSON response.
     *
     * @param mixed $data Data to encode as JSON.
     * @param int $status HTTP status code.
     * @return JsonResponse
     */
    public function json($data = [], int $status = 200): JsonResponse
    {
        return new JsonResponse($data, $status);
    }

    /**
     * Create a no-content (204) response.
     *
     * @param int $status HTTP status code.
     * @return Response
     */
    public function noContent(int $status = 204): Response
    {
        return new Response('', $status);
    }
}
