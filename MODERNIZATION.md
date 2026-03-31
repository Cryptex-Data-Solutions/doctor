# Doctor CLI — Modernization Plan

> **Branch:** `feature/node-22-upgrade`
> **Date:** 2026-03-19
> **Status:** In progress — Node 22 upgrade complete, auth and test infrastructure pending

---

## Table of Contents

- [Current State](#current-state)
- [Findings](#findings)
  - [Critical Issues](#1-critical-authentication-is-broken-for-modern-sharepoint)
  - [Test Infrastructure](#2-critical-test-site-setup-required)
  - [Cypress Auth](#3-high-cypress-test-auth-needs-rework)
  - [SharePoint API Compatibility](#4-medium-sharepoint-api-compatibility)
  - [Build & Runtime](#5-medium-build--runtime-concerns)
  - [Dependencies](#6-low-dependency-concerns)
- [Action Plan](#action-plan)
  - [Phase 1 — Auth & Test Site](#phase-1-auth--test-site-setup)
  - [Phase 2 — Cypress E2E](#phase-2-fix-cypress-e2e-tests)
  - [Phase 3 — CI/CD](#phase-3-update-cicd)
  - [Phase 4 — API Modernization](#phase-4-api-modernization-optional)
- [Setup Guide](#setup-guide)
- [Upstream Contribution Notes](#upstream-contribution-notes)

---

## Current State

### What's already done (Node 22 upgrade branch)

| Change | Commit |
|--------|--------|
| Remove `esm` wrapper, upgrade TypeScript 4.0 → 5.5, target ES2022 | `2232674` |
| Replace `node-fetch` with native `fetch`, upgrade `uuid` to v9, remove unused `react` | `c40a980` |
| Upgrade runtime dependencies for Node 22 compatibility | `e2b158b` |
| Upgrade Cypress 6.7.1 → 13.x (config migration, spec reorg) | `e6f0726` |
| Update CI/CD workflows for Node 22, upgrade Husky 5 → 9 | `94bf31d` |
| Fix runtime issues found during smoke testing (ESM import for CLI v11, page sections, list lookup) | `4644e2b` |

### What builds and compiles

- `npm run build` succeeds cleanly on Node 25 (latest)
- TypeScript compiles with no errors
- All source changes are consistent

### What does NOT work yet

- **Authentication against live SharePoint** — password auth is deprecated/blocked on most tenants
- **Cypress E2E tests** — depend on `node-sp-auth` which uses legacy auth
- **CI/CD pipeline** — secrets and auth method need updating
- **No test SharePoint site** configured for this fork

---

## Findings

### 1. CRITICAL: Authentication is broken for modern SharePoint

Microsoft has progressively disabled legacy authentication for SharePoint Online. This affects Doctor in two ways:

#### A. CLI authentication (publish command)

The CI/CD pipeline and most usage relies on password auth:

```bash
doctor publish -a password --username "..." --password "..."
```

This delegates to `m365 login --authType password` which uses the **ROPC** (Resource Owner Password Credential) OAuth flow. ROPC is **blocked** by:

- MFA-enabled accounts (now default on most tenants)
- Conditional Access policies
- Federated identity providers (ADFS, Okta, etc.)
- Tenants with security defaults enabled

Microsoft officially marks ROPC as "not recommended" and many tenants block it entirely.

**File:** `src/commands/authenticate.ts:24-25`

#### B. Cypress test authentication

The E2E tests use `node-sp-auth@3.0.3` for SharePoint authentication:

```
cy.visitSP() → cy.task('NodeAuth') → node-sp-auth.getAuth() → cookie headers → cy.visit()
```

`node-sp-auth` uses SAML/cookie-based auth patterns that Microsoft has been deprecating since 2022. Additionally:

- Setting auth headers in `cy.visit()` doesn't persist for SPFx-rendered pages
- SharePoint pages load scripts that make their own auth'd requests independently
- Cookie-based auth doesn't work with modern browser security policies

**Files:**
- `cypress/plugins/node-auth/index.ts`
- `cypress/support/commands.ts`

#### Resolution

Register an **Azure AD (Entra ID) App Registration** with:

- **Application permissions:** `Sites.FullControl.All` or `Sites.Manage.All`
- **Authentication:** Self-signed certificate (no client secret — certificates are required for app-only SharePoint access)
- Switch CLI auth to certificate: `-a certificate --appId ... --tenant ... --certificateBase64Encoded ...`

---

### 2. CRITICAL: Test site setup required

The E2E tests need dedicated SharePoint sites. CI expects **4 separate site URLs** (one per OS/shell variant):

| Secret | Purpose |
|--------|---------|
| `SITEURL_MACOS` | macOS bash build test |
| `SITEURL_LINUX` | Ubuntu bash build test |
| `SITEURL_WINDOWS` | Windows CMD build test |
| `SITEURL_WINDOWS_POWERSHELL` | Windows PowerShell build test |

Each site gets pages published to it, then Cypress validates the output.

**For local development**, only **one** site is needed.

Additional CI secrets required:

| Secret | Purpose |
|--------|---------|
| `USERNAME` / `PASSWORD` | Legacy — to be replaced with certificate auth |
| `NPM_TOKEN` | npm registry auth for publishing |
| `TRANSLATOR_KEY` | Azure Translator API key (multilingual tests) |
| `ACTIONS_PAT` | GitHub PAT for workflow retry on schedule failures |
| `DEBUG` | Enable debug logging |

---

### 3. HIGH: Cypress test auth needs rework

Even after fixing the CLI auth (certificate-based), the Cypress tests have a separate problem: they need to **visit SharePoint pages in a browser** as an authenticated user.

**Current approach (broken):**
```typescript
// cypress/support/commands.ts
cy.task('NodeAuth', config).then((data: any) => {
  cy.visit(`${config.siteUrl}/${pageUrl}`, {
    headers: data.headers,  // Cookie headers from node-sp-auth
  });
});
```

**Options for fixing:**

| Approach | Pros | Cons |
|----------|------|------|
| **MSAL + `cy.session()`** | Programmatic OAuth login, cached across tests | Complex setup, need to handle token → cookie conversion |
| **`cy.origin()` (Cypress 12+)** | Real browser login against `login.microsoftonline.com` | Slower, fragile against Microsoft login page changes |
| **Switch to Playwright** | Native multi-origin, better auth support | Rewrite all tests |
| **API-only validation** | Skip browser tests, validate via REST/Graph API | Loses visual regression coverage |

**Recommended:** MSAL + `cy.session()` for Cypress, or consider Playwright migration as a longer-term move.

---

### 4. MEDIUM: SharePoint API compatibility

#### 4a. OData Verbose format in MultilingualHelper

**File:** `src/helpers/MultilingualHelper.ts:78-85`

```typescript
"content-type": "application/json;odata=verbose"
// With __metadata types:
{ "__metadata": { "type": "SP.Web" } }
```

This is legacy OData v3 format. While still supported today, Microsoft is moving toward OData v4 (`application/json;odata.metadata=minimal`). Risk of future deprecation.

#### 4b. Hardcoded web part GUID

**File:** `src/helpers/PagesHelper.ts:176`

```typescript
spo page clientsidewebpart add ... --webPartId 1ef5ed11-ce7b-44be-bc5e-4abd55101d16
```

This is the built-in Text/Markdown web part. It's stable and unlikely to change, but there's no fallback or version check if Microsoft retires it.

#### 4c. FormDigest / contextinfo pattern

**File:** `src/helpers/MultilingualHelper.ts:69-76`

Uses `_api/contextinfo` to get `FormDigestValue` for CSRF protection on PATCH requests. This is the legacy CSOM pattern — still works but Microsoft Graph doesn't require it. If the `_api` endpoint is retired, this breaks.

#### 4d. Multilingual feature GUID

**File:** `src/helpers/MultilingualHelper.ts:13`

```typescript
const FEATURE_ID = "24611c05-ee19-45da-955f-6602264abaf8";
```

Hardcoded SharePoint feature ID for multilingual pages. Standard Microsoft feature ID — stable but undocumented.

---

### 5. MEDIUM: Build & runtime concerns

#### 5a. Shell command injection risk

**File:** `src/helpers/execScript.ts:74`

```typescript
const { stdout, stderr } = await execAsync(
  `${CliCommand.getName()} ${args.join(' ')}`
);
```

Commands are built via string interpolation. `ArgumentsHelper` wraps values in double quotes but does **not** escape `"`, `$`, or `` ` `` within values. A page title containing these characters could break execution or cause unintended behavior.

#### 5b. `bin/localm365` ESM bridge

```javascript
#!/usr/bin/env node
import('../node_modules/@pnp/cli-microsoft365/dist/index.js').catch(console.error);
```

Uses dynamic `import()` from CJS context to load ESM-only `@pnp/cli-microsoft365` v11. This works but is fragile. The entire package is CJS (`"module": "commonjs"` in tsconfig, no `"type": "module"` in package.json).

#### 5c. `execScript` retry logic

**File:** `src/helpers/execScript.ts:34-41`

Retry only happens once (no configurable retry count) with a fixed 5-second delay. For SharePoint throttling (HTTP 429), exponential backoff would be more appropriate.

---

### 6. LOW: Dependency concerns

| Package | Installed | Latest | Issue |
|---------|-----------|--------|-------|
| `node-sp-auth` | 3.0.3 | 3.0.9 | Legacy auth, needs replacement for Cypress |
| `listr` | 0.14.3 | 0.14.3 | Unmaintained since 2017. `listr2` is the successor |
| `inquirer` | ^8.0.0 | 12.x | v9+ is ESM-only; staying on v8 is fine for CJS |
| `applicationinsights` | ^2.9.0 | 3.x | v3 has ES module support |
| `@types/cheerio` | 0.22.24 | — | `cheerio@1.x` bundles its own types |
| `omelette` | 0.4.15 | 0.4.17 | Very old but stable |
| `markdown-it-anchor` | 7.0.2 | 9.x | Major versions available |
| `@fluentui/svg-icons` | 1.1.101 | 1.1.272+ | Many versions behind |

None of these are blockers. The `listr` → `listr2` migration would be the highest value (better error output, maintained), but it's a larger refactor.

---

## Action Plan

### Phase 1: Auth & test site setup

**Goal:** Get `doctor publish` working against a live SharePoint site from your machine.

#### Step 1.1 — Generate a self-signed certificate

```bash
# Generate private key and certificate (valid 2 years)
openssl req -x509 -newkey rsa:2048 -keyout doctor-test.key -out doctor-test.crt \
  -days 730 -nodes -subj "/CN=doctor-cli-test"

# Create PFX (some tools need this format)
openssl pkcs12 -export -out doctor-test.pfx -inkey doctor-test.key -in doctor-test.crt -passout pass:

# Base64 encode the PFX for Doctor CLI
base64 -i doctor-test.pfx -o doctor-test.pfx.b64
```

#### Step 1.2 — Create Azure AD App Registration

Via Azure Portal (portal.azure.com) → Entra ID → App registrations → New registration:

1. **Name:** `doctor-cli-test`
2. **Supported account types:** Single tenant
3. **Redirect URI:** None (not needed for certificate auth)

Then configure:

4. **API Permissions** → Add:
   - `SharePoint > Application permissions > Sites.FullControl.All`
   - Grant admin consent
5. **Certificates & secrets** → Upload `doctor-test.crt` (public key only)
6. Note the **Application (client) ID** and **Directory (tenant) ID**

#### Step 1.3 — Create a SharePoint test site

Via SharePoint admin center or PowerShell:

- **URL:** `https://{tenant}.sharepoint.com/sites/doctor-test`
- **Type:** Communication Site
- **Template:** Blank

#### Step 1.4 — Test locally

```bash
npm run build

./bin/doctor publish \
  -a certificate \
  --appId "{app-client-id}" \
  --tenant "{tenant-id}" \
  --certificateBase64Encoded "$(cat doctor-test.pfx.b64)" \
  -u "https://{tenant}.sharepoint.com/sites/doctor-test" \
  --retryWhenFailed
```

Run this against the `test-sample/` directory or clone `doctor-sample`.

#### Step 1.5 — Local config file

Create a `.env.local` (gitignored) or `doctor.local.json` with your test credentials so you don't have to pass them every time. Alternatively, add to `cypress.env.json` for test runs.

---

### Phase 2: Fix Cypress E2E tests

**Goal:** Get Cypress tests authenticating against modern SharePoint.

#### Step 2.1 — Replace `node-sp-auth` with MSAL

Replace the Cypress auth plugin:

```typescript
// cypress/plugins/node-auth/index.ts — rewrite
import { ConfidentialClientApplication } from '@azure/msal-node';

export async function NodeAuth(options: {
  clientId: string;
  tenantId: string;
  certificateBase64: string;
  siteUrl: string;
}) {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: options.clientId,
      authority: `https://login.microsoftonline.com/${options.tenantId}`,
      clientCertificate: {
        thumbprint: '...', // compute from cert
        privateKey: '...',  // extract from base64
      }
    }
  });

  const result = await cca.acquireTokenByClientCredential({
    scopes: [`https://${new URL(options.siteUrl).hostname}/.default`]
  });

  return { token: result.accessToken };
}
```

#### Step 2.2 — Update `cy.visitSP()`

The challenge is that app-only tokens can't be used for browser sessions. Options:

- **Option A:** Use `cy.request()` to validate page content via REST API instead of browser rendering
- **Option B:** Use a dedicated test user account with `cy.origin()` for interactive login
- **Option C:** Use `cy.session()` with MSAL public client flow (requires a test user)

This step needs prototyping to determine the best approach for the existing test assertions.

#### Step 2.3 — Update dependencies

```bash
npm uninstall node-sp-auth
npm install --save-dev @azure/msal-node
```

#### Step 2.4 — Update `cypress.env.json` format

```json
{
  "SITEURL": "https://{tenant}.sharepoint.com/sites/doctor-test",
  "APP_ID": "{app-client-id}",
  "TENANT_ID": "{tenant-id}",
  "CERTIFICATE_BASE64": "..."
}
```

---

### Phase 3: Update CI/CD

**Goal:** Get GitHub Actions pipelines working with certificate auth.

#### Step 3.1 — Update GitHub Secrets

| Old Secret | New Secret | Notes |
|------------|------------|-------|
| `USERNAME` | Remove or keep for reference | No longer needed |
| `PASSWORD` | Remove | No longer needed |
| — | `APP_ID` | Azure AD app client ID |
| — | `TENANT_ID` | Azure AD tenant ID |
| — | `CERTIFICATE_BASE64` | Base64-encoded PFX |
| `SITEURL_*` | Keep as-is | May consolidate to fewer sites |

#### Step 3.2 — Update workflow commands

In `release.yml`, change:

```yaml
# Before
doctor publish -a password --username "${{ secrets.USERNAME }}" --password "${{ secrets.PASSWORD }}" -u "${{ secrets[matrix.siteUrl] }}" ...

# After
doctor publish -a certificate --appId "${{ secrets.APP_ID }}" --tenant "${{ secrets.TENANT_ID }}" --certificateBase64Encoded "${{ secrets.CERTIFICATE_BASE64 }}" -u "${{ secrets[matrix.siteUrl] }}" ...
```

#### Step 3.3 — Simplify test matrix (optional)

Consider whether 4 separate SharePoint sites are really needed. Since Doctor publishes the same content regardless of OS, you could:

- Use 1-2 sites instead of 4
- Run build validation on all OS variants but publish tests on one

---

### Phase 4: API modernization (optional)

Lower priority — do after the pipeline is green.

#### 4a. Migrate OData verbose → minimal

In `MultilingualHelper.ts`, replace:

```typescript
// Old
"content-type": "application/json;odata=verbose"
{ "__metadata": { "type": "SP.Web" }, ... }

// New
"content-type": "application/json;odata.metadata=minimal"
{ ... }  // No __metadata needed
```

#### 4b. Harden command execution

In `ArgumentsHelper.ts` or `execScript.ts`, escape shell metacharacters in argument values to prevent injection via page titles or filenames.

#### 4c. Upgrade `listr` → `listr2`

`listr2` is the maintained successor with better TypeScript support and error rendering. This is a moderate refactor — the API is similar but not identical.

#### 4d. Remove `@types/cheerio`

`cheerio@1.x` (currently installed) bundles its own TypeScript types. The separate `@types/cheerio@0.22.24` package is for the old 0.x API and may cause type conflicts.

#### 4e. Add exponential backoff for retries

Replace the fixed 5-second retry delay in `execScript.ts` with exponential backoff, especially for SharePoint 429 throttling responses.

---

## Setup Guide

### Prerequisites

- Node.js >= 18 (tested on 22 and 25)
- Access to an Azure/Entra ID tenant with SharePoint Online
- Global admin or Application admin role (for app registration + admin consent)
- SharePoint admin access (for site creation)

### Quick start (local development)

```bash
# 1. Clone and build
git clone https://github.com/{your-fork}/doctor.git
cd doctor
git checkout feature/node-22-upgrade
npm ci
npm run build

# 2. Generate certificate (see Phase 1, Step 1.1)

# 3. Create app registration (see Phase 1, Step 1.2)

# 4. Create test site (see Phase 1, Step 1.3)

# 5. Clone sample content
git clone https://github.com/estruyf/doctor-sample
cd doctor-sample

# 6. Publish
../bin/doctor publish \
  -a certificate \
  --appId "{app-client-id}" \
  --tenant "{tenant-id}" \
  --certificateBase64Encoded "$(cat ../doctor-test.pfx.b64)" \
  -u "https://{tenant}.sharepoint.com/sites/doctor-test" \
  --retryWhenFailed
```

### Files to keep out of git

These are already in `.gitignore` but worth noting:

- `*.pem`, `*.pfx` — certificate files
- `cypress.env.json` — test credentials
- `test-sample/` — local test content
- `.env*` — environment files

---

## Upstream Contribution Notes

This fork's changes fall into two categories:

### Likely upstreamable

- Node 22 compatibility (already on branch)
- TypeScript 5.5 upgrade
- Cypress 13 upgrade
- Husky v9 upgrade
- Native fetch migration
- CI/CD workflow modernization (actions v4, Node 22)

### Fork-specific

- Specific tenant/site configuration
- Certificate credentials and secrets
- Test site URLs

### Strategy

1. Get everything working on this fork first
2. Open a PR against `estruyf/doctor` with the Node 22 + dependency upgrades (no auth changes)
3. Discuss auth modernization with the maintainer separately — they may have their own tenant setup
4. The auth changes could be offered as a separate PR with documentation
