# Hackathon Operations

## Bob budget

Hard cap for the rest of the Galaxium hackathon: **300 Bob calls**.

Bob is reserved for high-value reasoning only: architecture decisions, difficult debugging, targeted code review, and final submission polish. Routine verification and deployment are automated.

## Local verification

```bash
./scripts/hackathon/verify.sh quick
./scripts/hackathon/verify.sh full
./scripts/hackathon/verify.sh live
```

- `quick`: frontend lint, normal build, hackathon Pages build, git diff sanity check.
- `full`: quick checks plus Python service-layer tests and Java tests when Maven is available. Set `GALAXIUM_STRICT_BACKEND=1` to also run the upstream REST suite; it currently exposes a pre-existing `fastapi-mcp`/`mcp` compatibility issue caused by unconstrained dependencies.
- `live`: verifies the deployed GitHub Pages demo and its referenced assets.

## CI

`.github/workflows/verify.yml` runs frontend, Python, and Java verification automatically on pull requests and pushes to `main`.

GitHub Pages remains automated through `.github/workflows/pages.yml`.

## Bob review

Bob PR review is **manual only** to protect the 300-call budget. Trigger the workflow only on important checkpoints and provide the pull-request number.

Suggested call allocation:
- 80 — product/architecture
- 60 — hard debugging
- 50 — targeted review/testing
- 40 — demo/submission polish
- 70 — reserve
