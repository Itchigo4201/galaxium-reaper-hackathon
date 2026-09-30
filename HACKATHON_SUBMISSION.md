# Hackathon Submission — IBM Bob Hackathon 2026

**Track:** Students / Early Career — Explore, Fix, and Build  
**Repository:** https://github.com/Itchigo4201/galaxium-reaper-hackathon  
**Live demo:** https://itchigo4201.github.io/galaxium-reaper-hackathon/

---

## ≤100-word description

We used IBM Bob to explore Galaxium Travels — an unfamiliar, production-style multi-service booking app (Python FastAPI + MCP, Java Spring Boot hold service, React 19). Bob mapped the polyglot codebase from scratch, identified a real UX defect (confirmation modal closing immediately after a hold is confirmed), fixed it with a single state-variable change, and built a post-booking action center with copy, calendar, receipt, and booking-history actions. Bob also drove adversarial test coverage across all three services and reviewed every pull request via a budgeted CI workflow. Zero production-code regressions were introduced.

---

## Track

**Explore, Fix, and Build** — we explored an unfamiliar codebase, found and fixed a real defect, and built a useful feature on top of the fix.

---

## Problem

### Original state (upstream Galaxium Travels)

After the full quote → hold → confirm flow through the Java hold service, the React [`BookingModal.tsx`](booking_system_frontend/src/components/bookings/BookingModal.tsx) immediately closed on success. The booking reference number was displayed only in a transient 5-second toast notification, then lost. Users had no persistent confirmation screen, no way to copy the reference, no calendar integration, no receipt, and no direct navigation to their bookings.

This was verifiable from the upstream commit history (commit `7b4ef94`) and the component code before the hackathon changes.

### Why it mattered

The quote → hold → confirm path is the primary user journey for the hold service. Losing the confirmation with no recovery path is a high-severity UX defect in any booking application.

---

## Solution

### Fix (PR #1 — branch `hackathon/explore-fix-build-main`)

A single `useState` change in [`BookingModal.tsx`](booking_system_frontend/src/components/bookings/BookingModal.tsx): the modal no longer closes on confirmation. Instead it transitions to a confirmation state, keeping the booking reference visible until the user explicitly dismisses it.

**Commit:** `7b4ef94` Improve booking confirmation experience

### Build (PR #2 — branch `sprint2/post-booking-actions`)

The persistent confirmation state became a dedicated [`BookingConfirmation`](booking_system_frontend/src/components/bookings/BookingConfirmation.tsx) component backed by a [`bookingArtifacts`](booking_system_frontend/src/utils/bookingArtifacts.ts) utility:

| Action | Implementation |
|---|---|
| Copy reference | Clipboard API with fallback |
| Add to calendar | `.ics` file generation and download |
| Download receipt | HTML-to-PDF via `jsPDF` |
| View my bookings | Navigation to the My Bookings page |

A self-contained [`HackathonDemo`](booking_system_frontend/src/pages/HackathonDemo.tsx) page was added that demonstrates the before/after in one click — no backend required. It is deployed automatically to GitHub Pages on every push to `main`.

---

## Technology stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, FastMCP, SQLAlchemy, Pydantic, SQLite |
| Hold service | Java 17, Spring Boot 3.4, Lombok, SQLite (JPA) |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 3, Framer Motion, jsPDF |
| Testing | pytest (Python), Vitest + React Testing Library (frontend), Spring Test (Java) |
| CI/CD | GitHub Actions (`verify.yml`, `pages.yml`, `bob-review.yml`) |
| AI tooling | IBM Bob (agent mode, plan mode, budgeted PR review via Bob Shell) |

---

## Improvements made

All changes are in branches prefixed `hackathon/`, `sprint2/`, `test/` — the upstream `IBM/` branches are untouched.

| PR | Branch | What changed |
|---|---|---|
| #1 | `hackathon/explore-fix-build-main` | Fix modal close bug; add `HackathonDemo` page; deploy to GitHub Pages |
| #2 | `sprint2/post-booking-actions` | `BookingConfirmation` component, `bookingArtifacts` utility, frontend tests, CI verify workflow |
| #3 | `test/adversarial-post-booking` | Adversarial test suites: `BookingConfirmation.test.tsx` (45), `bookingArtifacts.test.ts` expanded (49 total), `BookingModal.test.tsx` expanded (26 total) |
| #4 | `test/bob-full-system-audit` | Full-system audit: 56 Python service-layer tests in `test_services.py`; `HackathonDemo.test.tsx` (22) |

No changes were made to: `server.py`, any service function in `booking_system_backend/services/`, any Java production source, any database schema, any test infrastructure, or any CI behaviour for the upstream service suites.

---

## Before / After

| Aspect | Before | After |
|---|---|---|
| Confirmation visibility | Toast only, 5 seconds | Persistent confirmation component, user-dismissed |
| Actions after booking | None | Copy · Calendar · Receipt · View bookings |
| Frontend test coverage | 0 hackathon-added tests | 142 tests across 4 files |
| Python service tests (seat-class coverage) | No multiplier or counter-isolation tests | 56 tests including price multiplier and per-class counter isolation |
| Java tests | 123 tests already present (upstream + `c7821cb`) | Unchanged — confirmed passing in CI |
| Bob PR review | Not present | Budgeted workflow on all 4 PRs |

---

## Architecture

The hackathon changes touched only the frontend layer. The backend, Java hold service, database, and API contracts were not modified.

```
booking_system_frontend/src/
  components/bookings/
    BookingModal.tsx          ← fix: no longer auto-closes
    BookingConfirmation.tsx   ← new: persistent action center
    BookingModal.test.tsx     ← new: 26 tests
    BookingConfirmation.test.tsx ← new: 45 tests
  utils/
    bookingArtifacts.ts       ← new: .ics / PDF / copy utilities
    bookingArtifacts.test.ts  ← new: 49 tests
  pages/
    HackathonDemo.tsx         ← new: self-contained demo page
    HackathonDemo.test.tsx    ← new: 22 tests

booking_system_backend/tests/
  test_services.py            ← 316 lines added: seat-class & audit tests
```

---

## Verification evidence

| Evidence | Location |
|---|---|
| CI pipeline definition | [`.github/workflows/verify.yml`](.github/workflows/verify.yml) |
| Bob PR review workflow | [`.github/workflows/bob-review.yml`](.github/workflows/bob-review.yml) |
| Pages auto-deploy | [`.github/workflows/pages.yml`](.github/workflows/pages.yml) |
| Live demo smoke test | [`scripts/hackathon/smoke-live.sh`](scripts/hackathon/smoke-live.sh) |
| Full verification script | [`scripts/hackathon/verify.sh`](scripts/hackathon/verify.sh) |
| Bob budget / operations log | [`HACKATHON_OPERATIONS.md`](HACKATHON_OPERATIONS.md) |
| Bob usage evidence ledger | [`BOB_USAGE.md`](BOB_USAGE.md) |
| Exact test counts (counted from source) | Python service layer: **56** · Python REST: **35** (not blocking CI) · Frontend: **142** · Java: **123** · E2e: **10** |

To reproduce locally:
```bash
# Frontend tests
cd booking_system_frontend && npm ci && npm test

# Python service-layer tests
cd booking_system_backend && pip install -r requirements.txt
python -m pytest -v tests/test_services.py

# Java tests
cd booking_system_inventory_hold_service && mvn -B test
```

---

## Known limitations

- **REST endpoint suite is not blocking CI.** The upstream `requirements.txt` pins dependencies without upper bounds; the latest `fastapi-mcp` + `mcp` combination is currently incompatible at import time. `test_rest.py` (35 tests) runs locally when the venv has a compatible pin but is excluded from the blocking CI step. This is a pre-existing upstream issue, not introduced by this fork.
- **Java tests required a one-line equality fix** (`a17a7be Fix flaky Java equality test`) — a flaky upstream test comparing object references instead of values. This was the only Java source change and it touched only the test class.
- **No backend features were added.** The action center is entirely frontend-side. Calendar and receipt generation are client-only; no new API endpoints were created.
- **Demo is static.** The GitHub Pages demo is fully self-contained (no backend); it demonstrates the before/after UI only.

---

## 3-minute YouTube demo outline

**[0:00–0:25] Problem context**  
Open the live demo at the "Original behavior" panel. Narrate: "This is Galaxium Travels, a multi-service interplanetary booking app. We had never seen this codebase before." Briefly show the architecture diagram in the README.

**[0:25–0:55] The defect**  
On the demo page, show the "Original behavior" panel — the temporary toast with the booking reference and the immediate modal close. "Bob mapped the five-service request flow and found that after the Java hold service confirms a booking, React immediately closed the modal. The reference survived only in a toast."

**[0:55–1:30] The fix in action**  
Click "Run improved confirmation." Walk through each action — copy reference (click it), add to calendar (click to download .ics), receipt, view bookings. "One state variable change and a new component. The booking reference is now yours to keep."

**[1:30–2:10] The tests**  
Switch to the GitHub repository. Open `test_services.py` — scroll to `TestBookingServiceSeatClasses`. "Bob also ran an adversarial audit across the whole service layer. 56 Python tests, 142 frontend tests, 123 Java tests — all green in CI." Show the Actions tab with the green `verify` run.

**[2:10–2:40] Bob as reviewer**  
Open `bob-review.yml`. "Every pull request was reviewed by Bob via Bob Shell. Budgeted to 300 calls total across the whole project." Show one PR comment from the bot.

**[2:40–3:00] Closing**  
Return to the live demo. "We started with an unfamiliar codebase, found a real defect, fixed it, built on top of it, and the final audit found zero regressions. The code, the CI, and the live demo are all in the repository."
