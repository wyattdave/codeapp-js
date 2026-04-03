# Decision Log

## Current Task
- Build a simple Office 365 Groups demo in examples/groups Demo that lists the current user's group memberships.

## Decisions
- Used `listMyGroups({ version: 3 })` because the repo-local Office 365 Groups wrapper maps that helper to the current user's membership list.
- Added generated connector API metadata to `dist/office365groups.js` because the runtime was failing before auth with `Cannot read properties of undefined (reading 'path')`.
- Added client-side filtering and a few summary metrics so the demo stays simple while still making the returned membership data easy to inspect.
- Audited `dist/office365groups.js` against the generated Office 365 Groups schema and confirmed the wrapper-backed operations are fully covered; added a guard so any future unmapped operation name fails with a clear wrapper error.

## Validation
- `get_errors` reported no issues in `dist/office365groups.js`, `dist/index.js`, or `agent/decision-log.md` after the wrapper metadata fix.

## Files
- `dist/index.html`: +4 / -180
- `dist/index.js`: +248 / -633
- `dist/styles.css`: +366 / -237
- `dist/office365groups.js`: +642 / -0 (new untracked file)
- `agent/decision-log.md`: +20 / -0 (new untracked file)
