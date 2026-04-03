# Agent Decision Log

Keep this file short. Record only durable decisions, constraints, and follow-ups that should survive a new session.

- For first-turn creative site/app requests without style guidance, ask colours/theme first, then ask separately about creating 5 mockups in `agent/`, and choose the visual direction yourself if style guidance is still missing.

- Chose a warm editorial visual direction for the simple table-list app in `dist/index.js`.
- This SharePoint list viewer resolves a connector table ID through `listTables` and uses table-ID CRUD only.

- SharePoint list viewer uses site URL `https://37wcqv.sharepoint.com/sites/testsite` and resolves the configured list name `Test List` to a connector table ID before reading or writing.

- SharePoint CRUD demo resolves the list through `listTables` and uses connector table APIs for all reads and writes.

- SharePoint CRUD demo derives editable fields from returned items instead of calling SharePoint `HttpRequest` for field metadata during startup.

- SharePoint CRUD demo uses a warm editorial layout in `dist/index.html`, `dist/index.js`, and `dist/styles.css`, with a create form, item table, selected-item editor, refresh action, and delete action.

- Advanced JSON overrides are available in create and edit forms so unsupported SharePoint field types can still be sent manually when required.

- Validated `dist/index.js`, `dist/index.html`, and `dist/styles.css` with workspace diagnostics after the build; no file errors were reported.

- Updated files: `agent/decision-log.md` (+8/-0), `agent/listSchema.json` (+34/-0), `dist/index.html` (+5/-238), `dist/index.js` (+844/-163), `dist/styles.css` (+505/-0).

- Follow-up updates after the runtime crash report: `agent/decision-log.md` (+12/-3), `agent/listSchema.json` (+34/-0, untracked), `dist/index.js` (+842/-163 total vs base).

- Crash fix: startup now resolves a real connector table ID before CRUD, derives form fields from returned items, and does not depend on SharePoint `HttpRequest` during initialization.

- SharePoint helper cleanup removed list-name CRUD wrappers from repo helper copies; raw `sendHttpRequest` remains available only as an explicit advanced escape hatch.

- Revalidated `dist/index.js`, `dist/sharepoint.js`, and `power.config.json` after the fallback hardening patch; no workspace diagnostics errors were reported.
