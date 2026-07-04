---
name: security-review
description: "Use when: performing an evidence-based security review of a Microsoft Power Apps Code App, especially checking external runtime sources, hard-coded passwords or secrets, security by obscurity, hard-coded access bypasses, DOM injection, and sensitive client-side data without reporting package, server, CSP-header, authentication-host, or infrastructure false positives owned by the Microsoft managed platform."
---

# Power Apps Code App Security Review

Review the shipped Code App as client-side code running inside the Microsoft Power Platform managed host. Report only findings supported by a concrete code path and repository evidence.

## Platform Threat Model

Assume Microsoft Power Platform owns:

- Microsoft Entra sign-in and host authorization.
- Connector authentication, consent, token acquisition, and credential storage.
- TLS, hosting infrastructure, platform HTTP headers, CSP delivery, DLP, Conditional Access, tenant isolation, and service-side rate limiting.
- Dataverse and connector permission enforcement.

Do not report missing app-defined implementations of those controls. Do not recommend adding custom OAuth, MSAL, access tokens, CORS headers, CSRF tokens, cookies, a backend authentication layer, or a CSP `<meta>` tag to this client-only app.

Treat all files shipped under the configured `buildPath` as publicly retrievable application assets. Never treat Microsoft-hosted delivery as protection for secrets embedded in HTML, CSS, JavaScript, JSON, source maps, or images.

## Review Scope

Read `power.config.json` first and determine the published `buildPath`. Review:

- Shipped HTML, JavaScript, CSS, JSON, manifests, and configuration under `buildPath`.
- App-authored code paths that invoke Dataverse, connectors, flows, navigation, browser storage, DOM sinks, or messaging APIs.
- Connection and database reference metadata for suspicious embedded credentials, while preserving normal generated identifiers.
- Any app-authored file outside `buildPath` that generates or copies shipped content.

Treat generated Microsoft SDK and connector wrappers as trusted platform integration code unless the app has modified them. Do not report URL strings found only in generated connector schemas, `externalDocs` metadata, comments, examples, or operation descriptions as runtime network calls.

## Package-Free Rule

The deployed Code App must have no runtime package dependency.

- Check shipped code for bare package imports, CDN libraries, remotely loaded scripts, and bundled third-party libraries.
- Allow the repository's self-contained `power-apps-data.js`, `codeapp.js`, and generated connector wrappers.
- Do not run `npm audit`, report package CVEs, request lockfiles, or recommend dependency upgrades when no package is used by the shipped app.
- Do not report Node/npm tooling outside `buildPath` as a runtime dependency unless it copies package code into the published output.

## Required Checks

### 1. External runtime sources

Find runtime dependencies on external origins, including:

- `<script src>`, stylesheet `<link>`, web fonts, frames, forms, media, workers, and module imports.
- `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, dynamic `import()`, beacon calls, or other direct network access.
- JavaScript or CSS assembled at runtime from a remote URL.

Report external executable or data dependencies because the platform CSP should block them unless an administrator deliberately changes policy. Prefer Microsoft connector helpers, Dataverse helpers, or locally shipped assets.

Do not report these as external-source findings:

- Relative or same-app asset paths.
- Calls made through `power-apps-data.js`, `codeapp.js`, generated connector wrappers, or generated flow services.
- `data:` or `blob:` image content.
- External HTTP(S) image URLs; images are allowed by this review policy. Still report an image URL if it embeds a secret, sensitive record data, or tracking credentials.
- Ordinary external hyperlinks that the user chooses to open; a link is not a loaded application dependency.
- URLs present only as text, documentation, schema metadata, or connector operation definitions.

Do not report a missing CSP declaration in app files. CSP is supplied by the managed host. Describe an external dependency as a deployment blocker, not proof that platform CSP is absent or bypassed.

### 2. Hard-coded passwords and secrets

Search shipped assets and their history-visible source for:

- Passwords, passphrases, API keys, client secrets, shared keys, connection strings, private keys, SAS tokens, bearer tokens, refresh tokens, signed URLs, and webhook secrets.
- Credentials hidden in query strings, headers, Base64, string fragments, arrays, character codes, or reversible encryption.
- Sensitive values written to console output, the debugger, browser storage, URLs, or DOM attributes.

Do not classify these as secrets without evidence:

- Environment, tenant, app, client, table, flow, connection-reference, or record GUIDs.
- Connector IDs, data-source names, API versions, public endpoints, schema metadata, or placeholder values.
- Variable names such as `password`, `token`, or `secretName` with no embedded secret value.
- Values retrieved at runtime from an approved connector or Azure Key Vault helper.
- Hashes, integrity values, cache versions, and Base64-encoded image assets.

When a suspicious high-entropy string is found, identify how it is used before reporting it.

### 3. Security by obscurity

Report hiding, encoding, renaming, or client-side concealment only when the code relies on it to protect data or privileged actions. Examples include hidden admin routes as the sole control, encoded credentials, undisclosed query parameters that unlock functions, or a non-exported function treated as inaccessible.

Do not report minification, bundling, private helper functions, hidden UI elements, Base64 images, disabled buttons, or non-obvious filenames by themselves. They become findings only when the app claims them as a security boundary.

### 4. Hard-coded access bypasses

Trace privileged and destructive actions from UI event to connector or Dataverse call. Check for:

- Fixed users, email addresses, roles, environment IDs, or allowlists that grant access in client code.
- `if (true)`, `allowAll`, `skipAuth`, `isAdmin = true`, development fallbacks, or catch blocks that default to access.
- Query-string, hash, cookie, local/session storage, or DOM values that enable admin state or bypass a check.
- Debug/test/mock modes that can invoke real privileged operations in the published app.
- Client-side role checks used as the only protection for sensitive data or actions.

Do not report the absence of a client-side role check when Dataverse or the connector is the intended authorization boundary. UI visibility checks are acceptable for user experience when the platform still denies unauthorized operations. If service-side permission cannot be proven from the repo, state that verification is required; do not label it a confirmed bypass.

### 5. Client-side issues still in scope

The managed host does not eliminate app-authored browser vulnerabilities. Check:

- Untrusted connector, Dataverse, URL, or user input reaching `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, script creation, or `javascript:` URLs without safe handling.
- Sensitive business data persisted in browser storage, embedded in URLs, or logged by production debugging.
- Custom `postMessage` handlers that accept privileged commands without validating the sender and message shape.
- User-controlled values used to build connector filters, raw HTTP requests, or navigation targets in a way that changes the intended operation.

Only report an injection sink when untrusted data can actually reach it. Static trusted markup assigned with `innerHTML` is not, by itself, a security finding.

## Avoid Managed-Platform False Positives

Do not report:

- Missing npm audits, dependency pinning, SRI, or package vulnerability scans when the shipped app uses no packages or remote libraries.
- Missing server headers, TLS settings, server-side validation files, CORS configuration, CSRF middleware, cookies, sessions, WAF rules, or infrastructure-as-code.
- The Microsoft SDK's host bridge, generated `postMessage` implementation, connector authentication metadata, or generated OpenAPI security definitions.
- Public client IDs, tenant/environment IDs, connection-reference GUIDs, or normal Power Platform URLs as credentials.
- A theoretical issue with no reachable source-to-sink or access-bypass path.
- Tenant configuration that cannot be established from the repository. Put it under verification notes only when it directly affects the reviewed feature.

## Review Method

1. Read `power.config.json`, locate `buildPath`, and inventory the shipped files.
2. Identify app-authored files separately from generated SDK/connector files.
3. Search broadly, then inspect context for every match. Useful starting patterns include:

   ```powershell
   rg -n -i 'https?://|fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|import\(' <buildPath>
   rg -n -i 'password|passwd|secret|api[_-]?key|client[_-]?secret|bearer|authorization|sas|connectionstring|private[_-]?key' <buildPath>
   rg -n -i 'skipAuth|allowAll|bypass|isAdmin|localStorage|sessionStorage|location\.(search|hash)' <buildPath>
   rg -n 'innerHTML|outerHTML|insertAdjacentHTML|document\.write|postMessage|addEventListener\(.?message' <buildPath>
   ```

4. Exclude generated metadata and allowed image-only matches before forming findings.
5. Trace each remaining match through its inputs, condition, privileged action or sink, and platform authorization boundary.
6. Report only confirmed findings. Keep uncertain platform or tenant state in a separate verification section.

## Report Format

Lead with findings in descending severity. For each finding include:

- Severity and concise title.
- Exact file and line evidence.
- Reachable source-to-sink or bypass path.
- Concrete impact in this Code App.
- Narrow remediation consistent with the package-free managed-host architecture.

Use `Critical`, `High`, `Medium`, or `Low` only for confirmed security defects. Label blocked external dependencies as `Deployment blocker`. Label unresolved environment-dependent facts as `Verification required`, not vulnerabilities.

If no confirmed findings exist, say so explicitly and list the files and required checks reviewed. Do not pad the report with generic best practices or managed-platform observations.
