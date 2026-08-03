# BASELINE-002 Implementation Plan — Profile Image Upload (Phase 5)

**Story ID:** BASELINE-002  
**Phase:** 5 (Software Engineer)  
**Owner:** Keel Software Engineer agent  
**Date:** 2026-07-31  
**Scope:** Backend code + unit tests (7 acceptance criteria, >=80% coverage)

---

## 1. Acceptance Criteria Scope

This phase implements **5 of 7 ACs** as backend code:

| AC | Requirement | Component | Backend/Frontend |
|----|-------------|-----------|------------------|
| AC-1 | File format validation (JPG/PNG magic bytes) | MagicByteValidator | Backend |
| AC-2 | File size validation (max 5 MB) | DimensionValidator | Backend |
| AC-3 | Upload to S3 + DB linkage | S3Adapter, ProfileImageService | Backend |
| AC-4 | Replace existing image on re-upload | ProfileImageService | Backend |
| AC-5 | Delete profile image (S3 + DB NULL) | ProfileImageService | Backend |
| AC-6 | Mobile platform support (picker UI) | — | **Frontend (phase 6+)** |
| AC-7 | Web drag-drop + file input UI | — | **Frontend (phase 6+)** |

**Phase 5 delivers:** Controllers, services, adapters, validators, DB migration, unit tests.  
**Phase 6+ delivers:** Mobile pickers (iOS/Android), web UI components, E2E tests.

---

## 2. Key Design Decisions (from ADR-005)

1. **S3 Storage:** us-east-1, same region as app servers, private ACL, no CDN at launch
2. **Object Key Pattern:** `users/{userId}/profile.{ext}` (e.g., `users/42/profile.jpg`)
3. **Replace Strategy:** Same-key overwrite (new image overwrites old if extension unchanged)
4. **Delete Semantics:** Permanent delete (DB NULL + S3 DELETE, idempotent)
5. **Presigned URLs:** Generated on-demand (3600s TTL), never stored in DB
6. **Resize:** None (store originals up to 5 MB)
7. **Concurrency Control:** SELECT FOR UPDATE row lock (1 upload per user at a time)

---

## 3. Production Code Files

### 3.1 ProfileImageController

**File:** `src/Controller/ProfileImageController.php`  
**Responsibility:** HTTP endpoints (POST, DELETE, GET); auth checks; error responses  
**Endpoints:**
- `POST /users/{userId}/profile-image` — multipart upload (200: return URL + timestamp)
- `DELETE /users/{userId}/profile-image` — idempotent delete (204: no content)
- `GET /users/{userId}/profile-image` — presigned URL retrieval (200: JSON or 404)

**Error Codes:**
- 400 — Malformed request
- 401 — Missing/invalid JWT
- 403 — Caller userId != path userId
- 422 — Validation error (format, size, etc.)
- 502 — S3 error
- 500 — DB error

**Test Coverage:** 6–8 tests (3 endpoints × auth variants + error codes)

### 3.2 ProfileImageService

**File:** `src/Service/ProfileImageService.php`  
**Responsibility:** Orchestration (validate → upload → DB update); replace logic; delete logic  
**Methods:**
- `uploadImage(int $userId, UploadedFile $file): array` — validate + upload + return URL
- `deleteImage(int $userId): void` — idempotent delete
- `getPresignedUrl(int $userId): ?string` — fetch URL from DB, generate presigned version
- `replaceImage(int $userId, UploadedFile $file): array` — atomic replace

**Internal Logic:**
- Uses `MagicByteValidator` and `DimensionValidator` for pre-S3 checks
- Uses `S3Adapter` for upload/delete/presigned URL generation
- Updates DB via repository/Eloquent model
- Locks user row during upload (SELECT FOR UPDATE) to prevent concurrent uploads

**Test Coverage:** 5–7 tests (happy path, S3 errors, DB errors, replace, concurrent lock)

### 3.3 S3Adapter

**File:** `src/Service/Adapter/S3Adapter.php`  
**Responsibility:** AWS S3 interactions (low-level)  
**Methods:**
- `putObject(string $key, string $filePath, string $contentType): string` — upload and return URL
- `deleteObject(string $key): void` — delete object; log orphan if fails
- `getPresignedUrl(string $key, int $expirySeconds = 3600): string` — generate presigned GET URL
- `objectExists(string $key): bool` — check if object present in S3

**Error Handling:**
- S3 PutObject error → throw `S3Exception` (caught by Service, returns 502)
- S3 DeleteObject error → log orphan, return (DB authoritative, async cleanup)
- Network timeout → throw `S3Exception`

**Test Coverage:** 4–6 tests (presigned URL generation, put/delete errors, network failures)

### 3.4 MagicByteValidator

**File:** `src/Service/Validator/MagicByteValidator.php`  
**Responsibility:** Validate file format via magic bytes (not MIME type or extension)  
**Constants:**
```
VALID_MAGIC_BYTES = {
  'jpg' => [0xFF, 0xD8, 0xFF],
  'png' => [0x89, 0x50, 0x4E, 0x47]
}
```

**Method:**
- `validate(string $filePath): bool` — read first 4 bytes, check against magic bytes
- `getExtensionFromMagic(string $filePath): ?string` — return 'jpg' or 'png' or null

**Validation Rules:**
- Reject extension mismatch (e.g., .jpg file with PNG magic bytes)
- Reject unsupported formats (GIF, BMP, WebP, etc.)

**Test Coverage:** 5 tests (accept JPG, accept PNG, reject GIF, reject BMP, extension mismatch)

### 3.5 DimensionValidator

**File:** `src/Service/Validator/DimensionValidator.php`  
**Responsibility:** Validate file size (5 MB max per AC-2)  
**Constants:**
```
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  // 5 MB
```

**Method:**
- `validate(string $filePath): bool` — check file size <= 5 MB
- `validateBytes(int $bytes): bool` — check bytes <= limit

**Test Coverage:** 4 tests (1 MB OK, 5 MB boundary OK, 5.1 MB reject, 10 MB reject)

### 3.6 Database Migration

**File:** `database/migrations/2026_07_31_000000_add_profile_image_columns.php`  
**Responsibility:** Additive-only migration (IF NOT EXISTS guard)  
**Changes:**
- Add `profile_image_url VARCHAR(2048) NULL` to users table
- Add `profile_image_updated_at TIMESTAMPTZ NULL` to users table
- Add check constraint: `profile_image_url SIMILAR TO 's3://.*' OR profile_image_url IS NULL`

**Rollback:** Not supported (additive-only; no down() method or trivial down)

---

## 4. Unit Tests

### 4.1 Test Files & Coverage

| Test File | Component | # Tests | Target Coverage |
|-----------|-----------|---------|-----------------|
| `tests/Unit/Service/Validator/MagicByteValidatorTest.php` | MagicByteValidator | 5 | 100% |
| `tests/Unit/Service/Validator/DimensionValidatorTest.php` | DimensionValidator | 4 | 100% |
| `tests/Unit/Service/Adapter/S3AdapterTest.php` | S3Adapter | 5 | 90%+ |
| `tests/Unit/Service/ProfileImageServiceTest.php` | ProfileImageService | 6 | 85%+ |
| `tests/Feature/Controller/ProfileImageControllerTest.php` | ProfileImageController + integration | 7 | 85%+ |

**Total:** 27 tests, >=80% coverage on changed lines

### 4.2 Test Scenarios by AC

**AC-1 (Format Validation):**
- `test_magic_byte_validator_accepts_valid_jpeg()`
- `test_magic_byte_validator_accepts_valid_png()`
- `test_magic_byte_validator_rejects_gif()`
- `test_magic_byte_validator_rejects_bmp()`
- `test_magic_byte_validator_rejects_extension_mismatch_jpg_as_png()`

**AC-2 (Size Validation):**
- `test_dimension_validator_accepts_1mb_file()`
- `test_dimension_validator_accepts_5mb_boundary()`
- `test_dimension_validator_rejects_5_1mb_file()`
- `test_dimension_validator_rejects_10mb_file()`

**AC-3 (S3 Upload + DB):**
- `test_post_profile_image_uploads_to_s3_and_updates_db()`
- `test_post_profile_image_returns_presigned_url()`
- `test_post_profile_image_sets_db_timestamp()`
- `test_post_profile_image_s3_failure_returns_502()`
- `test_s3_adapter_presigned_url_generation_works()`
- `test_s3_adapter_put_object_error_handling()`

**AC-4 (Replace):**
- `test_upload_replaces_existing_image_same_extension()`
- `test_upload_replaces_existing_image_different_extension_orphan_logged()`
- `test_concurrent_upload_blocked_by_row_lock()`

**AC-5 (Delete):**
- `test_delete_profile_image_nulls_db_and_deletes_s3()`
- `test_delete_non_existent_image_returns_204_idempotent()`
- `test_delete_s3_failure_nulls_db_orphan_logged()`
- `test_delete_returns_401_when_unauthorized()`
- `test_delete_returns_403_when_user_mismatch()`

### 4.3 Test Quality Rules (from Guardrails)

- ✓ Each test verifies one behavior, >= 2 assertions
- ✓ Tests must fail without implementation (verify at least one per AC)
- ✓ No `@`-suppression, no sleep-based retries, no special-cased inputs
- ✓ Follow project naming convention (test_* functions, descriptive names)
- ✓ Mocks for S3 client; fixtures for file content (magic bytes)

---

## 5. Error Handling & Edge Cases

### Error Paths Tested

| Scenario | HTTP Code | Handling | Test Case |
|----------|-----------|----------|-----------|
| No JWT token | 401 | Middleware (assumed present) | `test_post_returns_401_missing_auth()` |
| JWT invalid/expired | 401 | Middleware | (assumed handled upstream) |
| Caller userId != path userId | 403 | Controller authorization check | `test_delete_returns_403_user_mismatch()` |
| Malformed multipart | 400 | Framework (assumed) | (framework-level) |
| File format rejected | 422 | MagicByteValidator | `test_post_returns_422_invalid_format()` |
| File size too large | 422 | DimensionValidator | `test_post_returns_422_oversized_file()` |
| S3 PutObject timeout | 502 | S3Adapter error handling | `test_post_returns_502_s3_upload_error()` |
| S3 DeleteObject fails | (DB NULL) | Log orphan, continue | `test_delete_s3_failure_logs_orphan()` |
| DB constraint violation | 500 | DB exception (not tested in phase 5) | Out of scope |

---

## 6. Assumptions

1. **Framework:** PHP 8.1+ with PSR-12 style, Eloquent or Doctrine ORM, Laravel or Symfony-like routing
2. **S3 Bucket:** Pre-provisioned in us-east-1 with:
   - Private ACL
   - Block All Public Access enabled
   - AWS SDK v3 available (`composer require aws/aws-sdk-php`)
3. **Authentication:** JWT middleware present; extracts `userId` from token into `Auth::id()` or `request()->user()->id`
4. **Database:** PostgreSQL or MySQL with users table; migration runner available
5. **File Upload:** Framework handles multipart request parsing; `UploadedFile` or equivalent available
6. **Environment Variables:**
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or IAM role)
   - `AWS_DEFAULT_REGION=us-east-1`
   - `AWS_S3_BUCKET=<bucket-name>`
   - `S3_URL_EXPIRY_SECONDS=3600` (optional, default 3600)
7. **Testing:** PHPUnit or equivalent; Mockery for mocks; in-memory/temporary files for test fixtures
8. **No CJIS data:** Profile images are not CJIS-adjacent (no SSN, DOB, NAME, etc.)

---

## 7. Impact Analysis

**From ADR-005:** "Zero existing codegraph nodes affected (impact set empty)."

- All components are **new** (no modifications to existing code)
- **No existing tests need updating**
- **No dependencies on other services** (S3 is external; DB update is standard)
- **Retest list:** Empty (no dependent code)

---

## 8. Non-Blocking Follow-ups (Owner: Roadmap)

| Item | Due | Owner | Reason |
|------|-----|-------|--------|
| OrphanCleanupShell (async job) | Next sprint | Backend team | Clean up S3 orphans from extension changes |
| Image resizing (ResizeService) | Future story | Backend team | If customers request canonical sizes |
| CloudFront CDN integration | Future story | DevOps + Backend | If international latency becomes requirement |

---

## 9. E2E Scenarios for Phase 7 (e2e-engineer)

Browser/mobile flows to cover:

1. **Happy path (web):** User visits profile → drags JPG onto drop zone → sees avatar update + success message
2. **Happy path (mobile iOS):** User taps "Change avatar" → UIImagePickerController → selects photo → sent to server → avatar updates
3. **Happy path (mobile Android):** User taps "Change avatar" → ACTION_GET_CONTENT → selects photo → sent to server → avatar updates
4. **Replace flow:** User uploads image A (avatar shows A) → uploads image B → avatar shows B
5. **Delete flow:** User has avatar → clicks "Remove photo" → button disappears, avatar clears
6. **Error: invalid format:** User selects GIF → inline error "Only JPG/PNG allowed" → upload blocked
7. **Error: oversized:** User selects 10 MB file → inline error "Max 5 MB" → upload blocked
8. **Error: auth required:** Unauthenticated user navigates to /users/{id}/profile-image → 401
9. **Error: forbidden:** User A tries to upload avatar for User B → 403 Forbidden
10. **Concurrent uploads:** Two tabs/windows upload simultaneously → second request blocked or queued

---

## 10. Success Criteria (Self-Review Checklist)

- [ ] All 5 backend ACs (AC-1 to AC-5) implemented in production code
- [ ] Unit tests for all components pass (PHPUnit coverage >= 80% on changed lines)
- [ ] Code passes PSR-12 linter and PHPStan level 5
- [ ] No hardcoded strings (use constants/env vars)
- [ ] Error paths tested (400/401/403/422/502 codes)
- [ ] Integration test verifies POST → GET flow
- [ ] DELETE is idempotent (second DELETE on non-existent image returns 204)
- [ ] Concurrency lock tested (SELECT FOR UPDATE or equivalent)
- [ ] S3 errors handled (502 on PUT, orphan logged on DELETE failure)
- [ ] DB migration is additive-only (IF NOT EXISTS guard)
- [ ] No PII or CJIS-adjacent data in code/tests
- [ ] Implementation plan verified against each AC
- [ ] All artifact paths exist on disk
- [ ] Coverage output quoted in findings

---

## 11. Testing Commands

```bash
# Run unit tests with coverage
vendor/bin/phpunit --coverage-text tests/Unit tests/Feature

# Lint
./vendor/bin/phpcs --standard=PSR12 src/

# Static analysis
./vendor/bin/phpstan analyse --level 5 src/
```

---

## 12. File Checklist (Artifacts)

- [x] src/Controller/ProfileImageController.php
- [x] src/Service/ProfileImageService.php
- [x] src/Service/Adapter/S3Adapter.php
- [x] src/Service/Validator/MagicByteValidator.php
- [x] src/Service/Validator/DimensionValidator.php
- [x] database/migrations/2026_07_31_000000_add_profile_image_columns.php
- [x] tests/Unit/Service/Validator/MagicByteValidatorTest.php
- [x] tests/Unit/Service/Validator/DimensionValidatorTest.php
- [x] tests/Unit/Service/Adapter/S3AdapterTest.php
- [x] tests/Unit/Service/ProfileImageServiceTest.php
- [x] tests/Feature/Controller/ProfileImageControllerTest.php
- [x] docs/plans/BASELINE-002-implementation-plan.md

**Total:** 12 files (6 production + 1 migration + 5 tests)
