# BOB_USAGE.md — IBM Bob Evidence Ledger

This document records how IBM Bob was used across the hackathon, what it concretely produced, and how each output was independently verified. It is not a description of what Bob _could_ do — it is a ledger of what Bob _did_ do in this repository.

---

## Context

**Codebase:** IBM Galaxium Travels (multi-service demo). We forked it with zero prior familiarity.  
**Bob call budget:** 300 hard cap, tracked in [`HACKATHON_OPERATIONS.md`](HACKATHON_OPERATIONS.md).  
**Branch:** All hackathon work is on branches prefixed `hackathon/`, `sprint2/`, `test/`, `docs/` — the upstream `IBM/` branches are untouched.

---

## Stage 1 — Explore (cold-start codebase mapping)

**Bob task:** Map an unfamiliar multi-service codebase, identify the full request flow, and surface non-obvious constraints that would affect testing and development.

**Concrete outputs Bob produced:**

1. **Architecture summary** — mapped the five-hop request flow:
   ```
   React frontend
     → POST /quotes (Python FastAPI proxy)
     → Java Spring Boot /api/v1/quotes
     → Java POST /api/v1/quotes/{id}/holds
     → (on confirm) Java POST Python /internal/bookings/from-hold
     → Booking persisted in SQLite
   ```

2. **Non-obvious constraint identified:** `SessionLocal` must be patched in **two** places in tests (`db.SessionLocal` and `server.SessionLocal`). Patching only one leaves MCP tools hitting the real database. This is documented in [`AGENTS.md`](AGENTS.md) and [`booking_system_backend/tests/conftest.py`](booking_system_backend/tests/conftest.py:49).

3. **MCP dual-path identified:** Every booking operation is accessible as both a REST endpoint and an MCP tool. The MCP tools bypass FastAPI dependency injection and use `SessionLocal()` directly — a footgun for testing.

4. **`FastMCP` instantiation order identified:** `server.py` must instantiate `FastMCP` before `FastAPI`; swapping breaks lifespan composition. Bob surfaced this constraint before any code was written.

**Independent verification:**
- All four constraints above are codified in [`AGENTS.md`](AGENTS.md) (the project's authoritative footgun list), verifiable in `git log`.
- The `conftest.py` dual-patch pattern is live in the test suite and confirmed passing in CI.

---

## Stage 2 — Fix (defect identification and repair)

**Bob task:** Find the root cause of the confirmation modal closing immediately after a hold is confirmed.

**Concrete outputs Bob produced:**

1. **File and line identification:** [`booking_system_frontend/src/components/bookings/BookingModal.tsx`](booking_system_frontend/src/components/bookings/BookingModal.tsx) — the `onConfirm` callback path transitioned `showConfirmation` to `false` immediately on success, which closed the modal before the user could read the reference.

2. **Fix:** Change the state transition so a successful confirmation moves to a `confirmed` display state rather than closing. The booking reference stays visible until the user explicitly dismisses.

**Independent verification:**
- Commit `7b4ef94` (`Improve booking confirmation experience`) — the diff shows the exact `useState` change in `BookingModal.tsx`.
- The `HackathonDemo` page (`fc673e7`) demonstrates the before/after state in one click without requiring a backend.

---

## Stage 3 — Build (post-booking action center)

**Bob task:** Design and implement a post-booking action center on top of the fix.

**Concrete outputs Bob produced:**

1. **[`BookingConfirmation.tsx`](booking_system_frontend/src/components/bookings/BookingConfirmation.tsx)** — new component (219 lines) with four actions:
   - Copy booking reference (Clipboard API with textarea fallback)
   - Add to calendar (`.ics` file generation and download)
   - Download receipt (HTML → PDF via `jsPDF`)
   - View my bookings (navigation)

2. **[`bookingArtifacts.ts`](booking_system_frontend/src/utils/bookingArtifacts.ts)** — new utility (134 lines) providing `generateICS()`, `downloadReceipt()`, and `copyToClipboard()` — pure functions with no side effects on import, making them directly unit-testable.

3. **[`HackathonDemo.tsx`](booking_system_frontend/src/pages/HackathonDemo.tsx)** — self-contained demo page (157 lines) that runs the before/after scenario with sample data, no backend required. Deployed to GitHub Pages automatically.

**Independent verification:**
- Commit `c90d666` (`Build post-booking action center`) — diff shows all three new files.
- PR #2 (`sprint2/post-booking-actions`) — reviewed by Bob via `bob-review.yml`.
- Live at: https://itchigo4201.github.io/galaxium-reaper-hackathon/

---

## Stage 4 — Test (adversarial test coverage)

**Bob task:** Write adversarial tests across the full stack; attempt to find gaps in the implementation.

**Concrete outputs Bob produced:**

### Frontend tests (PRs #2 and #3)

| File | Tests | What they cover |
|---|---|---|
| [`BookingModal.test.tsx`](booking_system_frontend/src/components/bookings/BookingModal.test.tsx) | 26 | Modal open/close, seat class selection, confirm flow, error states, confirmation persistence |
| [`BookingConfirmation.test.tsx`](booking_system_frontend/src/components/bookings/BookingConfirmation.test.tsx) | 45 | All four actions, accessibility, edge cases (missing data, long references), callback firing |
| [`bookingArtifacts.test.ts`](booking_system_frontend/src/utils/bookingArtifacts.test.ts) | 49 | ICS generation, PDF receipt, clipboard copy, all seat classes, special characters, time zones |
| [`HackathonDemo.test.tsx`](booking_system_frontend/src/pages/HackathonDemo.test.tsx) | 22 | State transitions, URL param reading, reset button, demo notice text |
| **Frontend total** | **142** | |

### Python service-layer tests (PR #4)

Additions to [`test_services.py`](booking_system_backend/tests/test_services.py) (316 lines added in commit `1c24fd3`):

| Class | Tests | What they cover |
|---|---|---|
| `TestBookingServiceSeatClasses` | 9 | Price multipliers (economy ×1.0, business ×2.5, galaxium ×5.0); per-class counter isolation; seat exhaustion; invalid class error |
| `TestCancelBookingSeatRestore` | 3 | Cancellation restores the correct seat-class counter, not others |
| `TestFromHoldBookingContract` | 6 | `/internal/bookings/from-hold` contract: valid hold creates booking, unknown hold returns error, wrong user ID rejected |
| `TestFlightFiltering` (extended) | ~20 | Origin/destination filter, date range, price range, seat availability booleans, all sort fields, combined filters, empty results |
| **Total `test_services.py`** | **56** | |

**Independent verification:**
- All 56 tests pass with `python -m pytest -v tests/test_services.py` (no upstream code changes required).
- CI step `backend / Test service layer` in [`verify.yml`](.github/workflows/verify.yml) runs `test_services.py` on every PR.
- Commit `1c24fd3` (`Add full-system adversarial audit coverage`) and `a51a1f7` (`Add adversarial post-booking test suite`) are the authoritative diffs.

---

## Stage 5 — Review (Bob as PR reviewer)

**Bob task:** Review each pull request and post a structured comment.

**Concrete output:** [`.github/workflows/bob-review.yml`](.github/workflows/bob-review.yml) — a `workflow_dispatch` CI job that:
1. Fetches the PR diff and metadata using the GitHub CLI.
2. Runs Bob Shell (`bob run`) with a targeted prompt that classifies the PR and reports only concrete findings.
3. Extracts the `<<<BOB_REVIEW_BEGIN>>>` / `<<<BOB_REVIEW_END>>>` delimited block.
4. Posts the review as a comment on the PR using `gh pr review`.

**Budget discipline:** The workflow is `workflow_dispatch` only (not automatic) to protect the 300-call budget. It was triggered manually on each of the four PRs.

**Independent verification:**
- The workflow file is at [`.github/workflows/bob-review.yml`](.github/workflows/bob-review.yml).
- The prompt is inlined in the YAML (lines 46–72), not in an external file — the exact instructions Bob received are auditable.

---

## Stage 6 — Infrastructure (verification automation)

**Bob task:** Create a local verification script and live smoke test.

**Concrete outputs:**

1. **[`scripts/hackathon/verify.sh`](scripts/hackathon/verify.sh)** — three-tier local verification (`quick` / `full` / `live`):
   - `quick`: frontend lint + tests + both builds + `git diff --check`
   - `full`: adds Python service-layer tests and Java tests (Maven)
   - `live`: runs `smoke-live.sh` against the deployed Pages URL

2. **[`scripts/hackathon/smoke-live.sh`](scripts/hackathon/smoke-live.sh)** — fetches the deployed page, verifies HTTP 200, then individually checks every asset URL referenced in the HTML.

**Independent verification:**
- Commit `5a896c5` (`Automate hackathon verification and protect Bob budget`).
- `verify.yml` CI uses the same steps the script uses, confirming the script matches CI.

---

## Test count summary (source-counted, not estimated)

| Suite | Count | How verified |
|---|---|---|
| Python `test_services.py` | 56 | `python -m pytest --collect-only tests/test_services.py` |
| Python `test_rest.py` | 35 | Source count (not blocking CI — upstream dependency conflict) |
| Frontend (`BookingModal`, `BookingConfirmation`, `bookingArtifacts`, `HackathonDemo`) | 142 | `npm test` output |
| Java hold service (`@Test` annotations, 9 files) | 123 | `mvn test` / source count |
| E2e (`test_smoke.py` + `test_holds.py`) | 10 | Source count (require Docker or native stack) |
| **Blocking CI total** (services + frontend + Java) | **321** | Verified green in `verify.yml` |

---

## What Bob did NOT do

To maintain integrity:

- Bob did not modify `server.py`, any `services/` file, any Java production source, any database migration, or any API contract.
- Bob did not invent test assertions — all test data and expected values trace to documented behaviour (seat multipliers in [`AGENTS.md`](AGENTS.md), error codes in [`schemas.py`](booking_system_backend/schemas.py)).
- Bob did not run e2e tests automatically — e2e requires Docker or a running stack and was not part of the budgeted CI loop.
- Bob did not create or modify Terraform infrastructure, deployment scripts, or any upstream demo assets.

---

## Key files added or modified by hackathon work

| File | Status | Description |
|---|---|---|
| [`booking_system_frontend/src/components/bookings/BookingModal.tsx`](booking_system_frontend/src/components/bookings/BookingModal.tsx) | Modified | Fix: no auto-close on confirmation |
| [`booking_system_frontend/src/components/bookings/BookingConfirmation.tsx`](booking_system_frontend/src/components/bookings/BookingConfirmation.tsx) | New | Post-booking action center component |
| [`booking_system_frontend/src/components/bookings/BookingModal.test.tsx`](booking_system_frontend/src/components/bookings/BookingModal.test.tsx) | New | 26 tests |
| [`booking_system_frontend/src/components/bookings/BookingConfirmation.test.tsx`](booking_system_frontend/src/components/bookings/BookingConfirmation.test.tsx) | New | 45 tests |
| [`booking_system_frontend/src/utils/bookingArtifacts.ts`](booking_system_frontend/src/utils/bookingArtifacts.ts) | New | Calendar / receipt / clipboard utilities |
| [`booking_system_frontend/src/utils/bookingArtifacts.test.ts`](booking_system_frontend/src/utils/bookingArtifacts.test.ts) | New | 49 tests |
| [`booking_system_frontend/src/pages/HackathonDemo.tsx`](booking_system_frontend/src/pages/HackathonDemo.tsx) | New | Self-contained before/after demo page |
| [`booking_system_frontend/src/pages/HackathonDemo.test.tsx`](booking_system_frontend/src/pages/HackathonDemo.test.tsx) | New | 22 tests |
| [`booking_system_backend/tests/test_services.py`](booking_system_backend/tests/test_services.py) | Modified | +316 lines of adversarial service-layer tests |
| [`.github/workflows/verify.yml`](.github/workflows/verify.yml) | New | CI: frontend + Python + Java + live smoke |
| [`.github/workflows/pages.yml`](.github/workflows/pages.yml) | New | Auto-deploy to GitHub Pages |
| [`.github/workflows/bob-review.yml`](.github/workflows/bob-review.yml) | New | Budgeted Bob PR review workflow |
| [`scripts/hackathon/verify.sh`](scripts/hackathon/verify.sh) | New | Local verification (quick/full/live) |
| [`scripts/hackathon/smoke-live.sh`](scripts/hackathon/smoke-live.sh) | New | Live demo asset smoke test |
| [`HACKATHON_OPERATIONS.md`](HACKATHON_OPERATIONS.md) | New | Bob budget and operations log |
| [`HACKATHON_SUBMISSION.md`](HACKATHON_SUBMISSION.md) | New | Competition submission document |
| [`BOB_USAGE.md`](BOB_USAGE.md) | New | This file |
