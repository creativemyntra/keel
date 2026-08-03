<?php

declare(strict_types=1);

// Bootstrap for BASELINE-002 test suite
// Autoload dependencies via composer

$autoloaderPath = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoloaderPath)) {
    throw new RuntimeException(
        'Composer autoloader not found at ' . $autoloaderPath .
        '. Run: composer install'
    );
}

require_once $autoloaderPath;

/**
 * DateTime wrapper with toIso8601String() method (simulates Carbon/Chronos).
 */
class DateTimeWithIso8601 extends \DateTime {
    public function toIso8601String(): string {
        return $this->format('c');  // ISO 8601 format (e.g., 2026-07-31T12:30:00+00:00)
    }
}

/**
 * Laravel helper: now() — returns current datetime.
 * Used in tests for profile_image_updated_at timestamp.
 */
if (!function_exists('now')) {
    function now() {
        return new DateTimeWithIso8601('now');
    }
}
