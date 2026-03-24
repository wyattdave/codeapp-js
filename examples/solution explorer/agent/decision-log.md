
# Solution Explorer — Design Decision Log

## App Purpose
Browse all Dataverse solutions in a Power Apps environment and drill into their components. Uses `codeapp.js` for all Dataverse connections via `registerTable` / `listItems`.

## Dataverse Tables
- **solutions** (PK: `solutionid`) — fields: `friendlyname`, `uniquename`, `version`, `ismanaged`, `modifiedon`, `description`
- **solutioncomponents** (PK: `solutioncomponentid`) — filter by `_solutionid_value`, read `componenttype`, `objectid`

## Mockup Summary

| # | File | Aesthetic | Theme | Layout | Typography |
|---|------|-----------|-------|--------|------------|
| 1 | mockup-01-swiss-grid.html | Swiss/International Typographic | Light cream | Side-panel list + detail pane | DM Mono + Instrument Serif |
| 2 | mockup-02-dark-glass.html | Glassmorphism dark | Deep black + purple/cyan glows | Stats row + card list + glass detail | Outfit + Cormorant Garamond |
| 3 | mockup-03-paper-console.html | Developer paper/console | Warm paper + lined bg | Table rows + collapsible tree | IBM Plex Mono + Playfair Display |
| 4 | mockup-04-neon-noir.html | Cyberpunk/terminal | Pure black + cyan/magenta neon | Terminal search + list + accordion detail | JetBrains Mono + Syne |
| 5 | mockup-05-zen-garden.html | Organic/natural zen | Warm whites + sage/terracotta | Card tile grid + slide-out drawer | Karla + Crimson Pro |

## Share Feature
- Share modal: click any component row to share with User (systemusers) or Team (teams) via Dataverse search
- Share uses `callUnboundAction` from `codeapp.js` with `GrantAccess` registered in power.config.json
- `GrantAccess` declared in `databaseReferences.default.cds.dataSources`, `initDataSources`, and `registerCoreTables`
- Access mask grants Read, Write, Append, AppendTo, Share, Assign rights
- Component type → entity logical name mapping used for Target entity reference
- Previous raw `getRawClient` workaround replaced with proper `callUnboundAction('', '', 'GrantAccess', params)` pattern per updated skill
