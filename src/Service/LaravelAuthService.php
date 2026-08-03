<?php

declare(strict_types=1);

namespace App\Service;

use Illuminate\Support\Facades\Auth;

/**
 * Laravel-backed implementation of AuthService.
 *
 * Delegates to Illuminate\Support\Facades\Auth for production use.
 * Can be swapped for mock implementations in tests.
 */
final class LaravelAuthService implements AuthService
{
    /**
     * Check if a user is authenticated.
     *
     * @return bool True if a user is currently authenticated.
     */
    public function check(): bool
    {
        return Auth::check();
    }

    /**
     * Get the ID of the authenticated user.
     *
     * @return int|null User ID if authenticated, null otherwise.
     */
    public function id(): ?int
    {
        $id = Auth::id();
        return $id !== null ? (int) $id : null;
    }
}
