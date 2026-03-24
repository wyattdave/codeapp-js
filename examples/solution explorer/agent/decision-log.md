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

## Key Differentiators

### Mockup 01 — Swiss Grid
- Rigid two-column master/detail with 3px black borders
- Red accent dot per solution (red = unmanaged, grey = managed)
- Components grouped with red section headers and tabular rows
- Minimal animation — focus on typography and grid precision

### Mockup 02 — Dark Glass
- Ambient radial gradient blobs (purple + cyan + pink)
- Frosted glass cards with `backdrop-filter: blur`
- Gradient text headers, stats dashboard row
- Components as floating chip pills with hover effects

### Mockup 03 — Paper Console
- Lined paper background (repeating-linear-gradient)
- Dashed borders, developer-feel filter buttons (All / Unmanaged / Managed)
- Description wrapped in `/* comment */` style
- Collapsible tree view with `▸` arrows and left border lines

### Mockup 04 — Neon Noir
- CRT scanline overlay across entire viewport
- Drifting cyan glow blob animation
- Left-edge gradient stripe on active solution
- Blinking cursor in empty state, accordion sections with glow on focus

### Mockup 05 — Zen Garden
- SVG noise texture overlay for organic feel
- Responsive card tile grid (auto-fill, minmax)
- Slide-in drawer from right with backdrop blur
- Gradient top-stripe reveal on tile hover, soft rounded shapes
