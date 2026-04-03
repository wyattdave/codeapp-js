# Decision Log

- Active app work is in `codeApp v2/dist` and uses the repo Outlook and Office 365 Users wrappers directly from `index.js`.
- The active dashboard expects `office365` and `office365users` data source names in `power.config.json` so the bundled wrappers can resolve the connectors at runtime.
- For day-bounded calendar queries, use `getCalendarView` with `startDateTimeUtc` and `endDateTimeUtc`; filtering `listEvents` on `Start` causes a Graph type mismatch because `Start` is a `dateTimeTimeZone` object at the API layer.