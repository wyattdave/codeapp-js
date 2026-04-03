# Agent Decision Log

Keep this file short. Record only durable decisions, constraints, and follow-ups that should survive a new session.

## TODO

- Dataverse Demo uses the standard Dataverse `tasks` table as the core record source.
- Task sharing is implemented with the Dataverse `GrantAccess` action against `systemuser` principals.
- Dataverse Demo also registers `systemusers` in power.config.json so the app can load share targets without custom connector code.
- Updated dist/index.html, dist/index.js, and dist/styles.css; copied dist/power-apps-data.js so the example remains self-contained.
