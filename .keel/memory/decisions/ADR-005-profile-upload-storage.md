# ADR-005: Profile Upload Storage Strategy (S3 Region, CDN, Resize, Delete)

**Status:** Accepted | **Date:** 2026-07-31 | **Story:** BASELINE-002 | **Supersedes:** none | **Compatible with:** ADR-001, ADR-002, ADR-003, ADR-004

---

## Context

BASELINE-002 adds a profile image upload feature across iOS, Android, and Web platforms. Phase 2 left three open questions (OPEN-2, OPEN-3, OPEN-4) that are BLOCKING for the software-engineer phase (phase 5). The architect phase owns their resolution.

**OPEN-2:** Should the server resize uploaded images to a canonical size (e.g. 256x256) or store originals?  
**OPEN-3:** Which S3 region, bucket configuration, and CDN strategy should be used?  
**OPEN-4:** Should deletion be permanent (S3 delete + DB NULL) or soft (DB NULL, S3 archived for N days)?

---

## Options Considered

### OPEN-3: S3/CDN Strategy

**Option A — Same-region S3 bucket (us-east-1), no CDN (chosen)**
- Application servers in us-east-1 → S3 upload latency < 50ms p95 for 5 MB files.
- Presigned `GetObject` URLs serve reads directly from S3.
- Zero additional AWS resources required.

**Option B — CloudFront CDN in front of S3**
- Requires Origin Access Control (OAC), CloudFront distribution, signed-URL or signed-cookie forwarding.
- Appropriate for high-read, geographically distributed traffic.
- No AC specifies read latency requirements for profile images. This is speculative complexity per K-3.

Rejected: Option B is not traceable to any AC. It introduces three new AWS resources with no requirement driving them.

### OPEN-2: Image Resize

**Option A — Store originals, no server-side resize (chosen)**
- Minimal implementation: validation (format, size, dimensions) + S3 PUT.
- 5 MB limit constrains worst-case storage.

**Option B — Resize to canonical 256x256 on ingest**
- Adds a ResizeService between validation and S3 PUT.
- Reduces S3 storage and CDN bandwidth.
- No AC requires a canonical size. This is speculative complexity per K-3.

Rejected: Option B is not traceable to any AC.

### OPEN-4: Delete Semantics

**Option A — Permanent delete: DB NULL + S3 delete (chosen)**
- AC-5 says "delete profile image." The plain reading is permanent delete.
- Simpler implementation: no archive prefix, no lifecycle rule, no retention period.

**Option B — Soft delete: DB NULL + S3 archive (30-day retention)**
- Enables recovery from accidental deletion.
- No AC mentions recovery or retention.

Rejected: Option B is not traceable to any AC. The phase-2 OPEN-4 default (permanent delete) is applied.

---

## Decision

1. **S3 region:** `us-east-1` (same region as application servers).
2. **Bucket ACL:** Private. All four Block Public Access settings enabled.
3. **Object key pattern:** `users/{userId}/profile.{ext}` where `{ext}` is derived from the validated MIME type (`jpg` for JPEG, `png` for PNG), not the client filename.
4. **Read access:** Presigned `GetObject` URLs only. TTL: 3600 seconds (configurable via `S3_URL_EXPIRY_SECONDS`). Presigned URLs are generated on-demand and never stored in the database.
5. **Replace strategy:** Same-key overwrite. Uploading a new image PUTs to the same key, atomically replacing the previous object (when extension is unchanged). Extension changes create a new key; the old key becomes an orphan handled by the async cleanup job.
6. **Delete:** Permanent. DB column set NULL; S3 object deleted in the same request. If S3 delete fails, the DB is still set NULL and the orphaned object is logged for async cleanup.
7. **Resize:** None. Originals stored up to 5 MB. Future story adds ResizeService if required.
8. **CDN:** None at launch. Future story adds CloudFront if international latency becomes a requirement.
9. **Server-side encryption:** SSE-S3 (AES-256, AWS-managed). No additional cost; defense in depth.
10. **Versioning:** Disabled. Single active image per user; history is not required by any AC.

---

## Consequences

- Phase 5 (software-engineer) is unblocked. All three OPEN items (OPEN-2, OPEN-3, OPEN-4) are resolved.
- The presigned URL strategy is simple: standard AWS SDK `GetObjectCommand` with `getSignedUrl`. No CloudFront distribution, no signed cookies.
- Same-key overwrite eliminates the need to delete the old S3 object on replace (when extension is unchanged). The async orphan cleanup job handles the extension-change edge case.
- If PO later requires image resizing, a `ResizeService` is inserted between `DimensionValidator` and `S3Adapter` without changing the API contract or DB schema.
- If CDN is required in a future story, the presigned URL generation moves to CloudFront signed URL with OAC. The DB `profile_image_url` column format would need to change (CloudFront domain, not S3 domain). This is a future migration concern; the DB check constraint pattern must be updated.
- Standing rule for this project: **new file storage decisions must address: region, ACL, key pattern, read access method, delete semantics, and CDN requirement** before the software-engineer phase begins.
