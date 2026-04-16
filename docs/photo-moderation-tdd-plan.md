# Photo Moderation TDD Plan (Option 1)

## Goal
Implement image-to-resource parsing behind a strict pre-parse moderation gate, using test-driven development and repeatable automation.

This plan is intentionally designed so we can add:
- Policy engine (Option 2) without rewriting tests
- Evaluation harness (Option 3) with nightly metrics and drift detection

## Non-negotiable Product Rules (Initial)
1. Any image must pass moderation before parsing.
2. Ambiguous safety results are rejected (not accepted).
3. People-dominant images are rejected.
4. Out-of-scope images (not resources) are rejected.
5. Parsed output is always draft-only; never auto-published as verified.

## Repo Mapping
- API service tests: `api/src/api.test.ts` and new focused test files under `api/src/**/__tests__`
- Web tests: `web/src/web.test.tsx` and new page/component tests
- E2E smoke via scripts: `scripts/smoke.ps1` / `scripts/smoke.sh`
- Fixtures (safe synthetic + neutral): `api/test-fixtures/images/`
- Nightly eval job output artifacts (metrics JSON): `.artifacts/moderation-eval/`

## Phase 0 - Test Scaffolding First (No Feature Yet)
Create failing tests that define expected policy behavior.

### API Unit Tests (deterministic)
Create new file: `api/src/import/__tests__/moderationPolicy.test.ts`

Test cases:
1. Reject unsupported MIME types.
2. Reject files over size limit.
3. Reject files under minimum dimensions.
4. Reject when moderation verdict is `unsafe`.
5. Reject when moderation verdict is `ambiguous`.
6. Reject when relevance verdict is `not_resource`.
7. Reject when OCR contains banned terms.
8. Accept only when all gates pass.
9. Ensure accepted result state is `draft` and `evidence_status=photo_attached` (or similar enum).

### API Integration Tests (route behavior)
Create new file: `api/src/import/__tests__/photoImportRoutes.test.ts`

Test cases:
1. `POST /api/resources/import/photo/preview` returns 401 when unauthenticated.
2. Returns 400 on bad file type.
3. Returns 400 on over-limit file size.
4. Returns 422 (or chosen status) when moderation rejects.
5. Returns 200 with normalized draft payload when allowed.
6. Returns consistent structured rejection reason code (not free text only).

### Web Tests (UI + state)
Create new tests in `web/src/web.test.tsx` or split into `web/src/pages/resources/import-photo.test.tsx`.

Test cases:
1. Upload UI enforces client-side limits before request.
2. Rejection surfaces policy-safe user message.
3. Allowed image returns editable draft fields.
4. Commit path creates resource draft, not verified resource.
5. Error banners avoid leaking moderation model internals.

## Phase 1 - Minimal Implementation to Pass Tests
After tests fail, implement smallest API-first behavior:
1. Add route skeleton for photo preview endpoint.
2. Add file validator.
3. Add moderation provider interface (mocked in tests).
4. Add relevance classifier interface (mocked in tests).
5. Add decision function returning allow/reject with reason codes.

Keep parsing behind a fake adapter at first (TDD seam).

## Phase 2 - Robustness and Outlier Tests
Add mutation and transformation tests using safe fixtures only.

Create new file: `api/src/import/__tests__/imageRobustness.test.ts`

Test transformations:
1. Blur
2. Darken
3. Crop
4. Rotate
5. Compression artifacts
6. Text overlay

Expected behavior:
- Policy remains conservative.
- Ambiguous transformed images are rejected.
- Stable reason codes across equivalent failures.

## Phase 3 - CI Gates
Add CI checks so moderation regressions cannot silently ship.

Required checks:
1. PR gate: unit + integration + web tests.
2. Required threshold: 0 failing safety policy tests.
3. Snapshot check for reason-code schema compatibility.
4. Block merge if reason-code contract changes without explicit approval.

## Phase 4 - Nightly Evaluation (Option 3 Ready)
Add a separate nightly job that runs moderation pipeline on a controlled labeled dataset.

Job outputs:
1. `unsafe_recall`
2. `unsafe_false_negative_count`
3. `ambiguous_rejection_rate`
4. `resource_precision`
5. Drift report compared to last 7-day baseline

Artifacts:
- Save metrics JSON to `.artifacts/moderation-eval/DATE.json`
- Optional markdown summary in CI logs

Note:
- Keep restricted dataset access limited to authorized CI context.
- Store only IDs/metrics in logs, not image previews.

## Initial Reason-Code Contract (for tests)
Use structured machine-readable codes:
- `UNSUPPORTED_MIME`
- `FILE_TOO_LARGE`
- `DIMENSIONS_TOO_SMALL`
- `MODERATION_UNSAFE`
- `MODERATION_AMBIGUOUS`
- `TEXT_POLICY_VIOLATION`
- `NOT_A_RESOURCE_IMAGE`
- `INTERNAL_ERROR`

Tests should assert on these codes, not prose.

## Definition of Done for First Milestone
1. Preview endpoint exists and is authenticated.
2. Strict policy gates enforced before parsing.
3. All Phase 0 tests green.
4. Web flow shows clear allow/reject behavior.
5. Draft-only creation confirmed by tests.
6. CI blocks regressions in reason-code contract.

## Execution Order (TDD)
1. Write failing unit tests for decision logic.
2. Write failing integration tests for route contract.
3. Implement minimal policy code.
4. Write failing web tests for upload + rejection UX.
5. Implement minimal UI + API client integration.
6. Add robustness tests and fix edge cases.
7. Add CI policy gates.
8. Add nightly evaluation harness.

## Suggested First PR Scope
Keep first PR small and test-heavy:
1. Add `moderationPolicy.test.ts` with failing cases.
2. Add decision function with reason codes.
3. Add route skeleton (no real model calls yet; use adapter interface + mock).
4. Add 1 happy-path and 2 reject integration tests.

This keeps us TDD-first while preserving seams for option (2) policy engine and option (3) evaluation harness.
