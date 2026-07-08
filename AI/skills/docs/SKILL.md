---
name: docs
description: "Use when: creating application documentation for a Microsoft Power Apps Code App in Markdown or HTML, including app name, description, connections, connector actions, environment variables, configurable variables, colour palette, site map, data sources, and data schemas. For HTML output, use AI/skills/docs/docs-template.html and replace its sample content with evidence from the current app."
---

# Code App Documentation

Create clear, evidence-based documentation for the current app. The documentation can be generated as Markdown or as a styled HTML page.

## Required User Choice

Before generating the documentation, ask the user whether they want:

- Markdown
- HTML

If the user already specified a format, continue without asking again.

## Source Discovery

Start from the current app workspace.

1. Read `power.config.json` first.
2. Use `buildPath` from `power.config.json` as the published app source of truth.
3. Inventory app-authored files under `buildPath`, especially HTML, JavaScript, CSS, JSON, and generated connector files.
4. Inspect `connectionReferences`, `databaseReferences`, `dataSources`, and any connector wrappers under `dist/connectors` or the configured build folder.
5. Look in the `config` folder for any database schemas.
6. Search app code for runtime connector calls, environment variable reads, configurable constants, navigation views, colour variables, and schema definitions.

Do not invent missing metadata. If a required section cannot be proven from the repo, include the section with `Not found in app evidence` and list the files checked.

## Required Documentation Sections

Include these sections in both Markdown and HTML output:

1. App name
2. Description of what the app does
3. Connections used
4. Actions used
5. Environment variables
6. Configurable variables
7. Colour palette
8. Site map
9. Data sources
10. Data schemas

## Evidence Hints

Use these patterns as starting points, then inspect context before documenting the result:

```powershell
rg -n '"appName"|displayName|name|buildPath|connectionReferences|databaseReferences|dataSources' power.config.json .
rg -n 'getEnvironmentVariable|environmentvariable|ENV_|env[A-Z_]' <buildPath>
rg -n 'const\s+[a-zA-Z0-9_$]+|let\s+[a-zA-Z0-9_$]+|var\s+[a-zA-Z0-9_$]+' <buildPath>
rg -n '#[0-9a-fA-F]{3,8}|--[a-zA-Z0-9_-]+:\s*|rgb\(|rgba\(|hsl\(' <buildPath>
rg -n 'navigate|route|screen|page|view|modal|tab|hash|pathname|location' <buildPath>
rg -n 'getItems|createItem|updateItem|deleteItem|execute|connector|connection|dataSource' <buildPath>
```

## Section Guidance

### App name

Prefer the app name from `power.config.json`. If it is not present, infer from the main HTML title, header text, package metadata, or obvious app constants. State the source used.

### Description

Summarize what the app does from UI copy, page structure, data operations, connector actions, and main workflows. Keep it specific to the app's real behavior.

### Connections used

List connector and Dataverse connections from `connectionReferences`, connector wrapper usage, generated connector files, and data source registrations. Use friendly names and include internal names when available.

### Actions used

List the actual connector/helper actions invoked by app-authored code. Group actions by connector or data source. Do not document every generated operation in a connector wrapper unless the app actually calls it.

### Environment variables

List variables read via `getEnvironmentVariable(...)`, environment variable table access, obvious `ENV_*` constants, or documented environment variable schema names. Include purpose/default if visible.

### Configurable variables

List app-authored constants or settings that change behavior, such as feature flags, limits, URLs, default labels, theme settings, debug flags, table names, or configurable workflow values. Exclude short-lived local variables.

### Colour palette

Extract the real palette from CSS variables, theme objects, style blocks, and repeated colour literals. Name colours by purpose when the code provides names; otherwise use concise labels such as Primary, Accent, Neutral, Background, Border, Success, Warning, or Error.

### Site map

Map visible screens, routes, tabs, modals, panels, and navigation hierarchy. Base this on DOM sections, route handlers, navigation functions, button targets, and screen state variables.

### Data sources

List Dataverse tables, SharePoint lists, connector data sources, generated data source names, and any local JSON/static data used as real app data. Include source type and configured/internal name.

### Data schemas

For each data source, document visible fields, logical names, IDs, types, and descriptions when available. Prefer explicit schema metadata from `power.config.json`, connector metadata, table helpers, form definitions, sample records, or comments. If type is inferred from usage, mark it as inferred.

## Markdown Output

Create a single `.md` document. Use compact tables where they improve readability.

Recommended structure:

```markdown
# <App Name> Documentation

## Overview
## Connections Used
## Actions Used
## Environment Variables
## Configurable Variables
## Colour Palette
## Site Map
## Data Sources
## Data Schemas
## Evidence Reviewed
```

Include file references in the evidence section so the user can verify where the details came from.

## HTML Output

Use `AI/skills/docs/docs-template.html` as the starting point.

1. Copy the template to the requested output path or a sensible app-specific filename.
2. Replace every sample value in the template with data from the current app.
3. Update the `<title>`, header app name, subtitle, description, actions, sitemap, data source cards, schema panels, sidebar connections, environment variables, configurable variables, and colour palette.
4. Keep the existing CSS structure and interactive data-source panel behavior unless the user asks for a different design.
5. Add extra icon colour classes or inline-safe CSS classes as needed for the app's actual connections and palette.
6. Remove unused sample data such as `Enterprise Operations Hub`, `Tasks`, `Employees`, `SharePoint`, or `O365 Users` unless they are truly used by the app.

Do not edit `docs-template.html` in place unless the user explicitly asks to change the reusable template.

HTML must be self-contained. Do not depend on external stylesheets, scripts, CDNs, packages, or images.

## Quality Checks

Before finishing:

- Confirm every required section is present.
- Confirm HTML output contains no leftover template sample content unless it matches the app evidence.
- Confirm Markdown tables render cleanly.
- Confirm file paths and section labels are consistent.
- For HTML output, inspect the inline script block and make sure generated element IDs, `data-target` values, and panel IDs match.
