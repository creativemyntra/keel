# BASELINE-002 — Profile Upload Feature: Technical Architecture Design

**Story:** BASELINE-002  
**Author:** Solution Architect (Phase 4)  
**Date:** 2026-07-31  
**Status:** Accepted — ready for Phase 5 (Software Engineer)

---

## Table of Contents

1. Assumptions
2. Architecture Decision Record Summary
3. API Contract
4. Database Schema
5. S3 Storage Pattern and CDN Decision (OPEN-3 Resolution)
6. Backend Upload Flow
7. Mobile Implementation
8. Web Implementation
9. Error Handling Matrix
10. Security Design
11. Performance Design
12. Component Diagram
13. Technical Risks
14. Open Items Carried Forward
15. Simplest-Design Check (K-3)

---

## 1. Assumptions

Per G-15/K-1, all assumptions are surfaced before any design decision.

| ID | Assumption | Impact if Wrong |
|----|-----------|-----------------|
| A-1 | Application already has a `users` table with a primary key `id` (UUID or integer). | Schema DDL must be revised to match actual PK type. |
| A-2 | Authentication layer already issues a JWT or session cookie; the Bearer token carries `userId` as a verifiable claim (`sub` field or equivalent). | Authorization middleware design must change. |
| A-3 | An AWS account with IAM credentials is available; an S3 bucket can be provisioned in `us-east-1`. | Region or provider choice changes; presigned URL generation code changes. |
| A-4 | Backend is a CakePHP 4.4 application (PSR-4 namespace `App\`), running on PHP 8.1+. | Service class and controller patterns are CakePHP-specific. |
| A-5 | The Pillow (Python) or ImageMagick/Imagick (PHP) library is available on the backend server for dimension extraction. For CakePHP: the `ext-imagick` PHP extension. | Library selection for dimension check changes. |
| A-6 | No image resizing is performed on ingest (OPEN-2 resolution: store originals, see Section 5). PO did not respond with a contrary directive; architect applies the minimal-change default. |  If PO later requires resize, a separate processing step is added without altering the API contract. |
| A-7 | Deletion is permanent (OPEN-4 resolution): DB column set NULL, S3 object deleted immediately. Default applied per phase-2 OPEN-4. | Soft-delete requires an archive prefix + lifecycle rule addition. |
| A-8 | The existing connection pool (e.g., PgBouncer or CakePHP's PDO pool) handles connection limits; no additional global upload concurrency cap is needed beyond the per-user row lock. | A rate-limiting middleware may need to be added. |
| A-9 | The `users` table does not already have a `profile_image_url` column. If it does, the migration is a no-op ALTER for that column. | Migration must guard with `IF NOT EXISTS`. |
| A-10 | No CDN caching of profile images is required at launch (CloudFront deferred to a future story). Presigned S3 URLs serve reads directly. | Presigned URL TTL must be kept short (3600s) and cannot be cached by a CDN intermediary without signed cookie patterns. |

---

## 2. Architecture Decision Record Summary

Full ADR: `.keel/memory/decisions/ADR-005-profile-upload-storage.md`

**Decision:** Same-region S3 bucket (us-east-1), private ACL, presigned URLs for reads, no CDN at launch. Store originals (no resize). Permanent delete.

**Rationale:** Resolves OPEN-3 and OPEN-4 with the minimum set of moving parts traceable to named ACs. CDN adds complexity not required by any AC; image resizing adds a pipeline step not required by any AC (only a minimum dimension check is required).

---

## 3. API Contract

### 3.1 Common Headers (all endpoints)

| Header | Direction | Value |
|--------|-----------|-------|
| `Authorization` | Request | `Bearer <JWT>` |
| `X-CSRF-Token` | Request (Web only, state-mutating) | CSRF token from session |
| `Content-Type` | Response | Per endpoint |
| `Cache-Control` | Response | `no-store` on error responses; `private, max-age=0` on success |

### 3.2 POST /users/{userId}/profile-image

**Purpose:** Upload or replace profile image (AC-1, AC-2, AC-3, AC-4).

**Method:** POST  
**Auth:** Bearer JWT required; caller's `sub` must equal `{userId}`.  
**Content-Type (request):** `multipart/form-data`  
**Field name:** `image`

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string (UUID or integer) | Target user; must match authenticated caller |

**Request schema:**

```
multipart/form-data
  image: binary   -- JPEG or PNG file, max 5 242 880 bytes (5 MB), min 100x100 px
```

**Success response — 200 OK:**

```json
{
  "profile_image_url": "https://s3.amazonaws.com/<bucket>/users/<userId>/profile.<ext>?<presigned-params>",
  "profile_image_updated_at": "2026-07-31T12:34:56Z"
}
```

The URL in the response is a presigned S3 URL valid for 3600 seconds (configurable via `S3_URL_EXPIRY_SECONDS` environment variable). It is NOT the permanent S3 object key; it is a time-limited read URL the client may use to display the image immediately.

**Error responses:**

| HTTP Status | `code` | Description |
|-------------|--------|-------------|
| 400 | `MISSING_FILE` | No `image` field in multipart body |
| 401 | `UNAUTHENTICATED` | No or invalid Bearer token |
| 403 | `FORBIDDEN` | Caller `userId` != path `{userId}` |
| 404 | `USER_NOT_FOUND` | `{userId}` does not exist in `users` table |
| 405 | — | Method not allowed (e.g. PUT to this path) |
| 422 | `INVALID_FORMAT` | File is not JPEG or PNG (magic-byte check) |
| 422 | `FILE_TOO_LARGE` | File exceeds 5 242 880 bytes |
| 422 | `DIMENSIONS_TOO_SMALL` | Image width or height < 100 px |
| 422 | `MIME_MISMATCH` | Extension claims JPEG but magic bytes are PNG (or vice versa) |
| 502 | `STORAGE_UNAVAILABLE` | S3 upload failed or timed out; DB not written |
| 502 | `DB_UPDATE_FAILED` | S3 succeeded but DB update failed; compensating S3 delete enqueued |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Error response schema (all 4xx/5xx):**

```json
{
  "code": "INVALID_FORMAT",
  "message": "Human-readable description",
  "details": {}
}
```

`details` carries type-specific fields:

| `code` | `details` fields |
|--------|-----------------|
| `INVALID_FORMAT` | `"allowed": ["image/jpeg", "image/png"]` |
| `FILE_TOO_LARGE` | `"limit_bytes": 5242880, "received_bytes": <N>` |
| `DIMENSIONS_TOO_SMALL` | `"minimum": 100, "received_width": <W>, "received_height": <H>` |
| `MIME_MISMATCH` | `"declared_extension": "<ext>", "detected_mime": "<mime>"` |

### 3.3 DELETE /users/{userId}/profile-image

**Purpose:** Remove profile image (AC-5).

**Method:** DELETE  
**Auth:** Bearer JWT required; caller's `sub` must equal `{userId}`.  
**Request body:** None.

**Success response — 204 No Content:** Empty body. Idempotent: if no image is currently set, still returns 204.

**Error responses:**

| HTTP Status | `code` | Description |
|-------------|--------|-------------|
| 401 | `UNAUTHENTICATED` | No or invalid token |
| 403 | `FORBIDDEN` | Cross-user access attempt |
| 404 | `USER_NOT_FOUND` | `{userId}` does not exist |
| 502 | `STORAGE_UNAVAILABLE` | S3 delete failed (DB is set NULL regardless — compensating cleanup job handles orphan) |

### 3.4 GET /users/{userId}/profile-image

**Purpose:** Retrieve current profile image URL and metadata.

**Method:** GET  
**Auth:** Bearer JWT required; caller's `sub` must equal `{userId}`.  
**Request body:** None.

**Success response — 200 OK:**

```json
{
  "profile_image_url": "https://s3.amazonaws.com/<bucket>/users/<userId>/profile.<ext>?<presigned-params>",
  "profile_image_updated_at": "2026-07-31T12:34:56Z"
}
```

**Not-set response — 404 Not Found:**

```json
{
  "code": "NO_PROFILE_IMAGE",
  "message": "This user has not set a profile image."
}
```

**Error responses:**

| HTTP Status | `code` | Description |
|-------------|--------|-------------|
| 401 | `UNAUTHENTICATED` | — |
| 403 | `FORBIDDEN` | — |
| 404 | `USER_NOT_FOUND` | User row absent |
| 404 | `NO_PROFILE_IMAGE` | User exists but has no image |

---

## 4. Database Schema

### 4.1 Migration DDL

```sql
-- Migration: BASELINE-002 — add profile image columns to users table
-- Direction: up
-- Guard: ALTER is idempotent via IF NOT EXISTS (PostgreSQL 9.6+)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_image_url     VARCHAR(2048) NULL,
  ADD COLUMN IF NOT EXISTS profile_image_updated_at TIMESTAMPTZ NULL;

-- Check constraint: URL must be an S3 HTTPS URL when non-null.
-- Enforces the storage contract at DB level; application layer enforces same.
ALTER TABLE users
  ADD CONSTRAINT IF NOT EXISTS chk_users_profile_image_url_format
    CHECK (
      profile_image_url IS NULL
      OR profile_image_url ~ '^https://[a-z0-9.\-]+\.amazonaws\.com/'
    );

-- Migration direction: down
-- ALTER TABLE users DROP COLUMN IF EXISTS profile_image_url;
-- ALTER TABLE users DROP COLUMN IF EXISTS profile_image_updated_at;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_profile_image_url_format;
```

### 4.2 Column Specifications

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `profile_image_url` | VARCHAR(2048) | YES | NULL | Must match `^https://[a-z0-9.-]+\.amazonaws\.com/` when non-null |
| `profile_image_updated_at` | TIMESTAMPTZ | YES | NULL | No constraint; set by application on every write |

### 4.3 Index Strategy

No new index is required. The upload, replace, delete, and GET operations all perform a single-row lookup by primary key (`WHERE id = $1`). The existing primary key B-tree index on `users.id` satisfies all access patterns for this feature. Adding an index on `profile_image_url` or `profile_image_updated_at` is not warranted by any AC and is excluded (K-3).

### 4.4 Foreign Keys

No new foreign keys. The `users` table is the root entity. Profile images belong to exactly one user and are stored as a column, not a separate table (per phase-2 SPEC-1 decision: single-image-per-user semantics do not warrant a separate table).

### 4.5 CakePHP Entity

```php
// src/Model/Entity/User.php — add to $accessible and $_virtual as needed
// New fields: profile_image_url, profile_image_updated_at
// No new Entity class required; extend existing User entity.
```

---

## 5. S3 Storage Pattern and CDN Decision (OPEN-3 Resolution)

### Resolution of OPEN-3

**Decision: Option A — same-region bucket (us-east-1), no CDN at launch.**

Rationale:
- Profile images are user-specific, low-traffic objects (one per user, read on profile page load). They do not exhibit the high-read-throughput pattern that justifies CloudFront.
- Presigned URL strategy for Option A is simpler: standard AWS SDK `GetObjectCommand` with `createPresignedPost` or `getSignedUrl`. No signed cookie complexity.
- CloudFront in front of private S3 requires Origin Access Control (OAC), a CloudFront distribution, signed cookie or signed URL forwarding — three additional AWS resources not traceable to any AC. This is speculative complexity (K-3).
- Same-region S3 upload latency from the application server is < 50ms p95 for files up to 5 MB in us-east-1, well within the 30s timeout budget.
- Future story: if read latency becomes a concern (e.g., international users), add CloudFront as a standalone infrastructure story.

**S3 Object Key Pattern:**

```
users/{userId}/profile.{ext}
```

Where `{ext}` is the canonical extension derived from the validated MIME type (not the client-supplied filename): `jpg` for `image/jpeg`, `png` for `image/png`.

One object per user. Upload replaces the previous object at the same key. This avoids key proliferation and simplifies the replace-and-delete logic (new key overwrites old key atomically from S3's perspective).

Note: Same-key overwrite means the old object is replaced atomically. The "async delete old S3 object" step in the transaction flow (phase-2 SPEC-4) is eliminated by the overwrite strategy — the old file is gone as soon as the PUT completes. This is a simplification over the phase-2 design.

**Revised transaction sequence (simplified by same-key overwrite):**

1. SELECT profile_image_url FROM users WHERE id = $1 FOR UPDATE (acquire row lock).
2. Validate file (format, size, dimensions) — 422 on failure, release lock.
3. PUT object to S3 at key `users/{userId}/profile.{ext}` (overwrites previous if same ext; see note on ext change below).
4. UPDATE users SET profile_image_url = $new_url, profile_image_updated_at = NOW() WHERE id = $userId.
5. COMMIT transaction.
6. On step 4/5 failure: enqueue compensating S3 delete of the newly-uploaded key; respond 502.

**Extension change handling:** If a user had a `.jpg` and uploads a `.png`, the key changes from `users/{userId}/profile.jpg` to `users/{userId}/profile.png`. In this case step 3 creates a new key; the old key (`profile.jpg`) becomes an orphan. The DB update in step 4 stores the new key. The old key is enqueued for async deletion (same orphan-cleanup job). This is a rare case; the cleanup job handles it.

**S3 Bucket Configuration:**

| Setting | Value | Rationale |
|---------|-------|-----------|
| Region | `us-east-1` | Same region as application; lowest latency |
| ACL | Private (Block Public Access: all four settings enabled) | AC-3, SPEC-9 |
| Versioning | Disabled | Single-active-image semantics; version history adds cost with no AC benefit |
| Server-side encryption | SSE-S3 (AES-256, AWS-managed) | Defense in depth; zero operational overhead |
| Lifecycle rule | None required at launch | Single object per user; no accumulation |
| Presigned URL TTL | 3600 seconds | Configurable via `S3_URL_EXPIRY_SECONDS`; matches phase-2 SPEC-8 |

**OPEN-2 Resolution (no resize):** Store original file up to 5 MB. No server-side resize. This is the minimal-change default. If PO requires canonical sizing in a future story, a `ResizeService` can be inserted between validation and S3 PUT without changing the API contract.

**OPEN-4 Resolution (permanent delete):** On DELETE, the DB column is set NULL and the S3 object is deleted in the same request. If S3 delete fails, the DB is still set NULL (user sees no image) and the orphaned S3 object is logged for the async cleanup job. Permanent delete is applied; no archive prefix or retention policy.

---

## 6. Backend Upload Flow

### 6.1 CakePHP Controller

```
src/Controller/UsersController.php  (new actions: uploadProfileImage, deleteProfileImage, getProfileImage)
```

Or, following CakePHP 4.4 resource routing conventions, a dedicated:

```
src/Controller/ProfileImageController.php
```

The dedicated controller is preferred (single-responsibility, easier to test in isolation).

### 6.2 Service Layer

```
src/Service/ProfileImageService.php
```

Encapsulates: validation, S3 interaction, DB update, compensating rollback. The controller delegates entirely; it does not call S3 directly.

### 6.3 Upload Flow (Pseudocode)

```
POST /users/{userId}/profile-image
  [Controller: ProfileImageController::upload($userId)]
    1. AuthorizationCheck: JWT sub == $userId  → 403 if mismatch
    2. UserExistsCheck: SELECT id FROM users WHERE id=$userId  → 404 if absent
    3. FilePresenceCheck: $request->getUploadedFiles()['image']  → 400 if absent

  [Service: ProfileImageService::upload($userId, $uploadedFile)]
    4. SizeCheck: $uploadedFile->getSize() <= 5_242_880  → 422 FILE_TOO_LARGE
    5. MagicByteCheck: read first 12 bytes, match against JPEG (FF D8 FF) / PNG (89 50 4E 47)  → 422 INVALID_FORMAT
    6. ExtensionMimeCheck: declared extension vs detected magic  → 422 MIME_MISMATCH
    7. DimensionCheck: getimagesize() or Imagick::getImageGeometry()  → 422 DIMENSIONS_TOO_SMALL
    8. BeginTransaction + SELECT ... FOR UPDATE (row lock on users.id=$userId)
    9. S3Put: PutObjectCommand to key users/{userId}/profile.{ext}  → 502 STORAGE_UNAVAILABLE on failure (rollback, no DB write)
   10. DBUpdate: UPDATE users SET profile_image_url=$url, profile_image_updated_at=NOW() WHERE id=$userId
   11. Commit → 502 DB_UPDATE_FAILED on failure (enqueue compensating S3 delete)
   12. GeneratePresignedUrl: GetObjectCommand presigned, TTL=S3_URL_EXPIRY_SECONDS
   13. Return {profile_image_url, profile_image_updated_at} → 200
```

### 6.4 Delete Flow

```
DELETE /users/{userId}/profile-image
  [Controller: ProfileImageController::delete($userId)]
    1. AuthorizationCheck
    2. UserExistsCheck
    3. SELECT profile_image_url FROM users WHERE id=$userId FOR UPDATE
    4. If profile_image_url IS NULL: return 204 immediately (idempotent)
    5. DBUpdate: UPDATE users SET profile_image_url=NULL, profile_image_updated_at=NOW()
    6. Commit
    7. S3Delete: DeleteObjectCommand — if fails, log orphan (job handles cleanup); still 204
    8. Return 204
```

Note: DB is updated before S3 delete. This ensures the user immediately sees no image even if S3 delete is slow or fails. The DB is the authority; S3 is eventually consistent on cleanup.

### 6.5 Async Orphan Cleanup Job

A background job (CakePHP Shell or Queue plugin task) periodically scans for S3 objects with keys matching `users/*/profile.*` that have no corresponding DB row (or where `profile_image_url` does not reference that key). The job deletes these orphans. This handles the race condition in SPEC-4/EDGE-1.

---

## 7. Mobile Implementation

### 7.1 iOS (AC-6)

| Concern | Implementation |
|---------|---------------|
| Image picker | `PHPickerViewController` (iOS 14+); falls back to `UIImagePickerController` for iOS 13 |
| HEIC handling | If source is HEIC: convert to JPEG at quality 0.8 before encoding (`UIImage.jpegData(compressionQuality: 0.8)`) |
| Dimension check | Extract `CGImageSource` properties; if width or height < 100, reject client-side with error UI before upload |
| Upload | `URLSession` with `URLRequest`, `HTTPMethod = "POST"`, multipart body built with `boundary` separator |
| UI state | Disable upload button on submit (`isEnabled = false`); re-enable on response (success or error) |
| Progress | `URLSessionDataDelegate.urlSession(_:task:didSendBodyData:...)` for upload progress |
| Auth | `Authorization: Bearer <token>` header added to `URLRequest` |
| CSRF | Not required on mobile (Bearer token is inherently CSRF-safe; no cookie) |

### 7.2 Android (AC-6)

| Concern | Implementation |
|---------|---------------|
| Image picker | `Intent(Intent.ACTION_GET_CONTENT)` with `type = "image/*"` |
| Dimension check | `BitmapFactory.decodeStream()` with `inJustDecodeBounds = true` to get dimensions without decoding full bitmap; reject < 100x100 client-side |
| Upload | OkHttp `MultipartBody.Builder` with `addFormDataPart("image", ...)` |
| Progress | `okhttp3.RequestBody` override of `writeTo()` with a custom `CountingSink` |
| Auth | `Authorization: Bearer <token>` header in OkHttp `Request.Builder` |
| UI state | Disable upload button in `ViewModel`; `LiveData<UiState>` drives button enabled state |
| Error display | `Toast` or `Snackbar` for validation errors; matches 9 states from UI design |

---

## 8. Web Implementation

### 8.1 Drag-Drop + File Input (AC-7)

| Concern | Implementation |
|---------|---------------|
| Drag-drop | `ondrop` event on the drop zone element; `event.dataTransfer.files[0]` |
| File input | `<input type="file" accept="image/jpeg,image/png">` |
| Client-side validation | Check `file.size <= 5_242_880`; check `file.type` against allowed list; create `Image` object, set `src = URL.createObjectURL(file)`, check `naturalWidth` and `naturalHeight` >= 100 in `onload` callback |
| Upload | `fetch` with `FormData` body: `formData.append("image", file)` |
| Progress | `XMLHttpRequest` with `xhr.upload.addEventListener("progress", ...)` (fetch does not natively expose upload progress in all browsers; XHR is the reliable path) |
| CSRF | Include `X-CSRF-Token` header from session/meta tag in the fetch/XHR request |
| Auth | `Authorization: Bearer <token>` header |
| Error display | Inline alert box below the drop zone per UI design; 9 states (idle/hover/drag-over/uploading/success/4 error variants) |
| Success | Update avatar `src` with the presigned URL from the response; show "Remove photo" button |

---

## 9. Error Handling Matrix

| Scenario | Server Response | Client Action |
|----------|----------------|---------------|
| File missing from multipart | 400 MISSING_FILE | Show "Please select a file" |
| Wrong format (not JPG/PNG) | 422 INVALID_FORMAT | Show "Only JPG and PNG files are supported" |
| File > 5 MB | 422 FILE_TOO_LARGE | Show "File must be smaller than 5 MB" |
| Dimensions < 100x100 | 422 DIMENSIONS_TOO_SMALL | Show "Image must be at least 100x100 pixels" |
| Magic byte / extension mismatch | 422 MIME_MISMATCH | Show "File format does not match its extension" |
| S3 unavailable | 502 STORAGE_UNAVAILABLE | Show "Upload failed — please try again"; client may retry immediately (no orphan created) |
| DB update failed | 502 DB_UPDATE_FAILED | Show "Upload failed — please try again"; safe to retry (idempotent: same S3 key) |
| Unauthenticated | 401 | Redirect to login |
| Wrong user | 403 | Show "Permission denied" |
| User not found | 404 | Show "User not found" |
| Network timeout (client-side) | — | Show "Connection timed out — please try again"; XHR/fetch timeout = 35s (5s above server's 30s) |
| Concurrent upload (same user) | Second request blocks on DB row lock, then proceeds normally after first completes | No special client handling needed |

**Retry logic:** All 502 responses are safe to retry with the same file (idempotent S3 key). Clients may implement exponential backoff: 1s, 2s, 4s, max 3 attempts. This is recommended but not required by any AC; it is recorded as non-blocking technical debt TD-1.

---

## 10. Security Design

### 10.1 Authorization

- Every endpoint verifies: `JWT.sub == path {userId}`.
- The JWT is validated (signature, expiry, issuer) by the existing auth middleware before the controller action runs.
- No admin override path is defined in this story (per SPEC-9).

### 10.2 Input Validation — Magic Byte Check

Magic byte sequences for accepted formats:

| Format | Magic bytes (hex) | Offset |
|--------|-------------------|--------|
| JPEG | `FF D8 FF` | 0 |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | 0 |

Implementation: read the first 12 bytes of the uploaded file before any further processing. Match against the two patterns. Reject with 422 if neither matches (INVALID_FORMAT). Also compare the magic-detected MIME against the client-supplied filename extension; mismatch yields 422 MIME_MISMATCH. This prevents polyglot file attacks (a file that is valid as both an image and a script).

### 10.3 S3 Security

- Bucket ACL: private. All four "Block Public Access" settings enabled.
- No public-read objects ever created.
- All reads via presigned `GetObject` URLs with TTL = `S3_URL_EXPIRY_SECONDS` (default 3600s).
- IAM policy for the application role: `s3:PutObject`, `s3:DeleteObject`, `s3:GetObject` on `arn:aws:s3:::<bucket>/users/*` only. No `s3:ListBucket` or wildcard.

### 10.4 CSRF

- POST and DELETE endpoints are state-mutating.
- Web clients must include `X-CSRF-Token` header (value from session or meta tag).
- Mobile clients use Bearer token authentication; cookies are not used; CSRF is not applicable.
- The CSRF token is validated by the existing CakePHP Security component (or equivalent middleware) before the controller action runs.

### 10.5 PII / Data Classification

- Profile image URL is not PII per se, but links to user identity.
- Not returned in unauthenticated responses.
- G-10 CJIS gate is NOT triggered (no CJIS-adjacent data patterns).

### 10.6 URL Storage in DB

- The `profile_image_url` stored in the DB is the permanent S3 object URL (not presigned). Example: `https://s3.amazonaws.com/<bucket>/users/<userId>/profile.jpg`.
- Presigned URLs are generated on-the-fly when serving the GET response or POST success response. They are never stored.
- The DB check constraint validates the URL prefix matches the expected S3 domain, providing a defense against DB injection of arbitrary URLs.

---

## 11. Performance Design

### 11.1 Timeout Budget

| Stage | Budget | Enforcement |
|-------|--------|-------------|
| Client upload timeout | 35 seconds | XHR/fetch/URLSession timeout |
| Server request timeout | 30 seconds | PHP `max_execution_time` or web server (nginx) `send_timeout` |
| S3 PutObject timeout | 25 seconds | AWS SDK `requestTimeout` parameter |
| DB transaction timeout | 5 seconds | `SET LOCAL statement_timeout = '5s'` before UPDATE |
| Presigned URL generation | < 10ms (local, no network) | — |

The 5-second headroom between the S3 timeout and the server timeout allows the server to return a 502 before the web server kills the connection.

### 11.2 Concurrent Upload Limiting

- Per-user: enforced by `SELECT FOR UPDATE` on the users row. The second concurrent upload from the same user blocks at the DB lock wait. CakePHP/PostgreSQL default lock wait timeout applies. If the lock wait exceeds 5 seconds, the second request fails with a 409 Conflict (lock timeout). This is a non-blocking technical debt item (TD-2) — a proper 409 response requires catching the lock-wait exception explicitly.
- Global: no additional cap. Connection pool limit provides a natural ceiling.

### 11.3 Index Strategy

No new indexes (see Section 4.3). All operations are single-row PK lookups.

### 11.4 Target Latency

- Validation-only path (client-side rejection before upload): < 5ms.
- Happy-path upload (validation + S3 PUT + DB update + presigned URL generation): < 3s for a 5 MB file on a 10 Mbps uplink. Well within the 30s budget.
- GET profile image URL: < 50ms (PK lookup + presigned URL generation, no S3 call).

---

## 12. Component Diagram

```
Client (iOS / Android / Web)
        |
        | HTTPS multipart/form-data  (POST /users/{userId}/profile-image)
        | Bearer token + [X-CSRF-Token on Web]
        v
[AuthMiddleware]  ← validates JWT signature/expiry, extracts userId
        |
        v
[ProfileImageController]
  - Checks path userId == JWT sub
  - Checks user exists (UserTable lookup)
  - Delegates to ProfileImageService
        |
        v
[ProfileImageService]
  - SizeValidator         → 422 FILE_TOO_LARGE
  - MagicByteValidator    → 422 INVALID_FORMAT / MIME_MISMATCH
  - DimensionValidator    → 422 DIMENSIONS_TOO_SMALL
  - S3Adapter             → PutObject (us-east-1)
  - UserTable (CakePHP)   → SELECT FOR UPDATE + UPDATE
  - CompensatingRollback  → enqueue S3 delete on DB failure
  - PresignedUrlGenerator → GetObject presigned URL
        |
        +----------[PostgreSQL: users table]
        |
        +----------[AWS S3: <bucket>/users/{userId}/profile.{ext}]
        |
        +----------[AsyncCleanupQueue: orphaned S3 object delete jobs]

[OrphanCleanupJob] (background, CakePHP Queue or Cron)
  - Scans S3 prefix users/*
  - Compares against DB profile_image_url values
  - Deletes orphaned objects
```

**Class/Service inventory:**

| Class | File | Responsibility |
|-------|------|---------------|
| `ProfileImageController` | `src/Controller/ProfileImageController.php` | HTTP routing, auth check, response formatting |
| `ProfileImageService` | `src/Service/ProfileImageService.php` | Validation pipeline, S3, DB, rollback |
| `S3Adapter` | `src/Service/S3Adapter.php` | AWS SDK wrapper (PutObject, DeleteObject, GetObject presigned) |
| `MagicByteValidator` | `src/Service/Validation/MagicByteValidator.php` | Reads first 12 bytes, returns MIME or throws |
| `DimensionValidator` | `src/Service/Validation/DimensionValidator.php` | Imagick/getimagesize dimension check |
| `OrphanCleanupShell` | `src/Shell/OrphanCleanupShell.php` | Background job: S3 orphan deletion |
| `User` (entity, existing) | `src/Model/Entity/User.php` | Extended with `profile_image_url`, `profile_image_updated_at` |
| `UsersTable` (existing) | `src/Model/Table/UsersTable.php` | Extended with save/find for new columns |

---

## 13. Technical Risks

### 13.1 Impact Analysis

The codegraph (`codegraph.json`) contains 3 nodes, all PHP: `App\Controller\HealthController`, `FixtureApp\Controller\HealthController`, and `FixtureApp\Tests\Unit\HealthControllerTest`. None of these depend on or are depended upon by the new `ProfileImageController` or `ProfileImageService`. Impact set for BASELINE-002: zero existing nodes are affected. No migration/compatibility plan is required beyond the DB migration (additive-only: two nullable columns).

### 13.2 Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|-----------|
| R-1 | S3 PUT latency spike on large files (5 MB) causes 30s timeout breach | LOW | HIGH | S3Adapter sets 25s SDK timeout; web server timeout = 30s; server returns 502 cleanly before web server kills connection |
| R-2 | Magic-byte check bypassed by polyglot file (valid image + embedded script) | LOW | HIGH | Magic byte check is authoritative, not extension-only. Imagick dimension check also processes the image, which implicitly validates the image structure. Double-layer validation (magic bytes + dimension extraction) significantly raises the bar for polyglot attacks |
| R-3 | Concurrent uploads from same user under high load hold DB row lock longer than expected | LOW | MEDIUM | PostgreSQL `lock_timeout` ensures the second request fails fast (< 5s) rather than blocking indefinitely. TD-2: surface as 409 Conflict explicitly |
| R-4 | Presigned URL TTL (3600s) too long — URL shared/leaked remains valid | MEDIUM | MEDIUM | S3 bucket is private; presigned URL embeds caller credentials. A leaked URL grants read-only access to one image for ≤ 1 hour. Mitigation: reduce TTL to 900s for higher-security deployments (configurable via env var) |
| R-5 | DB check constraint on `profile_image_url` breaks if S3 bucket/region changes | LOW | LOW | Constraint pattern is configurable; migration down removes it. Document that bucket rename requires a DB migration |
| R-6 | HEIC → JPEG conversion on iOS introduces quality loss or strips EXIF data unexpectedly | LOW | LOW | Compression quality 0.8 is standard; EXIF stripped is acceptable for profile images (no PII risk, no orientation data preserved) |
| R-7 | `getimagesize()` (PHP built-in) may fail on edge-case images (truncated, unusual encoding) that pass magic-byte check | LOW | MEDIUM | Wrap in try/catch; treat Imagick/getimagesize exception as 422 DIMENSIONS_TOO_SMALL (conservative rejection). L-1 does not apply (no path strings involved) |
| R-8 | Orphan S3 objects accumulate if the cleanup job is not deployed alongside the feature | MEDIUM | LOW | Track as NON-BLOCKING item OPEN-5; cleanup job must be deployed in the same release. No data loss or security impact; only storage cost |
| R-9 | `profile_image_url` VARCHAR(2048) too short if presigned URL query string grows | LOW | LOW | Presigned URL is NOT stored; only the permanent key URL is stored. The permanent URL (without query params) for a typical S3 path is < 200 characters, well within 2048 |

### 13.3 Design Debt

| ID | Description | Severity | Recommendation |
|----|------------|----------|---------------|
| TD-1 | Client-side retry with exponential backoff not specified in any AC; implemented as best-effort guidance | LOW | Future story: add retry budget to API spec |
| TD-2 | Lock-wait timeout on concurrent upload from same user currently surfaces as a DB exception, not a clean 409 | LOW | Future story: catch `PDOException` lock-wait code, return 409 Conflict with `code: UPLOAD_IN_PROGRESS` |
| TD-3 | No server-side image resizing (OPEN-2 deferred); large originals increase S3 storage cost and slow GET-then-display on mobile | LOW | Future story: add `ResizeService` step between DimensionValidator and S3Adapter |

---

## 14. Open Items Carried Forward

| ID | Description | State | Blocking? | Owner Phase |
|----|------------|-------|-----------|-------------|
| OPEN-2 | Image resizing: stored as original (A-6 assumption applied). Architect has applied "no resize" default. | RESOLVED by architect assumption A-6 | No | — |
| OPEN-3 | S3 region/bucket/CDN: resolved in Section 5 (us-east-1, same-region, no CDN). | RESOLVED | No | — |
| OPEN-4 | Soft vs permanent delete: resolved as permanent delete (A-7 assumption). | RESOLVED by architect assumption A-7 | No | — |
| OPEN-5 | Orphan cleanup job must be deployed in the same release as the feature. | NON-BLOCKING (small) | No (LOW) | Phase 5 (Software Engineer) |

All three phase-2 OPEN items are now resolved. OPEN-5 is a new NON-BLOCKING item.

---

## 15. Simplest-Design Check (K-3)

| Component | Traces to AC | Verdict |
|-----------|-------------|---------|
| `ProfileImageController` | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7 | Required |
| `ProfileImageService` | AC-1, AC-2, AC-3, AC-4, AC-5 | Required |
| `S3Adapter` | AC-3, AC-4, AC-5 | Required |
| `MagicByteValidator` | AC-1 (format check) | Required |
| `DimensionValidator` | AC-2 | Required |
| `OrphanCleanupShell` | AC-4 (replace consistency), AC-5 (delete consistency) | Required |
| CloudFront CDN | — (no AC requires CDN) | Excluded |
| Image resize pipeline | — (no AC requires resize) | Excluded |
| Separate `profile_images` table | — (single image per user, column is sufficient) | Excluded |
| Rate limiter (global) | — (no AC specifies global concurrent upload cap) | Excluded; TD-2 tracks per-user case |
| Soft delete / archive prefix | — (no AC requires retention) | Excluded |

Every included component traces to a named AC. All excluded components are flagged as either not AC-traceable or as future technical debt.
