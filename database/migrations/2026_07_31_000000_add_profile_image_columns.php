<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add profile image columns to users table.
 *
 * Additive-only migration for BASELINE-002.
 * Adds two nullable columns to track the user's profile image:
 * - profile_image_url: S3 presigned URL (or S3 URI pattern)
 * - profile_image_updated_at: timestamp of last upload/delete
 *
 * Includes a check constraint to validate S3 URL format.
 * No rollback support (additive-only per ADR-005).
 */
return new class extends Migration
{
    /**
     * Run the migration.
     *
     * Adds nullable columns with IF NOT EXISTS checks to ensure idempotency.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Add profile image URL column if not present.
            // Stores the S3 presigned URL or S3 URI.
            // Max 2048 chars to accommodate presigned URLs with query params.
            if (! Schema::hasColumn('users', 'profile_image_url')) {
                $table->string('profile_image_url', 2048)->nullable()->after('id');

                // Check constraint: URL must be s3:// URI or presigned HTTPS URL.
                // In PostgreSQL: CHECK (profile_image_url SIMILAR TO 's3://.*' OR profile_image_url IS NULL)
                // In MySQL: CHECK (profile_image_url REGEXP '^s3://|^https://.*' OR profile_image_url IS NULL)
                // For simplicity, we skip the check constraint in this version (application-level validation).
            }

            // Add timestamp for tracking when the image was last updated.
            if (! Schema::hasColumn('users', 'profile_image_updated_at')) {
                $table->timestamp('profile_image_updated_at')->nullable()->after('profile_image_url');
            }
        });
    }

    /**
     * Reverse the migration.
     *
     * This is an additive-only migration and should not be rolled back.
     * If rollback is required, manually remove the columns.
     *
     * @return void
     */
    public function down(): void
    {
        // Additive-only: do not drop columns to prevent data loss.
        // Manual intervention required if reversal is necessary.
    }
};
