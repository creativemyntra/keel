<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Abstract authentication service interface.
 *
 * Provides abstraction over Laravel's Auth facade to enable testing
 * without the full Laravel framework. Implementations can mock or
 * delegate to Illuminate\Support\Facades\Auth.
 */
interface AuthService
{
    /**
     * Check if a user is authenticated.
     *
     * @return bool True if a user is currently authenticated.
     */
    public function check(): bool;

    /**
     * Get the ID of the authenticated user.
     *
     * @return int|null User ID if authenticated, null otherwise.
     */
    public function id(): ?int;
}
