<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Abstract response factory interface.
 *
 * Provides abstraction over HTTP response creation to enable testing
 * without the full Laravel framework.
 */
interface ResponseFactory
{
    /**
     * Create a JSON response.
     *
     * @param mixed $data Data to encode as JSON.
     * @param int $status HTTP status code.
     * @return JsonResponse
     */
    public function json($data = [], int $status = 200): JsonResponse;

    /**
     * Create a no-content (204) response.
     *
     * @param int $status HTTP status code.
     * @return Response
     */
    public function noContent(int $status = 204): Response;
}
