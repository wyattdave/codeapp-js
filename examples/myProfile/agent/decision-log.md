# Decision Log

## Current Task
- Build a simple Office 365 Users demo in examples/myProfile that shows the signed-in user's key profile details and profile image.

## Decisions
- Use the repo-local `dist/office365users.js` wrapper as the source of truth for Office 365 Users operations.
- Keep the app as a single-screen demo in `dist/` with all startup logic in `boot()`.
- Reuse the connector photo pattern already present elsewhere in the repo: treat `getUserPhoto(...)` as returning a base64 payload or `.value` payload and apply a fallback avatar when absent.

## Validation
- `get_errors` reported no issues in `dist/index.html`, `dist/index.js`, `dist/styles.css`, or `agent/decision-log.md` after the demo rebuild.

## Files
- `dist/index.html`: +3 / -166
- `dist/index.js`: +300 / -120
- `dist/styles.css`: +392 / -0 (new untracked file)
- `agent/decision-log.md`: +12 / -0 (new untracked file)
