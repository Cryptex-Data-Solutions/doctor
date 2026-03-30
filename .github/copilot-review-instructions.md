# Copilot Review Instructions

## Project Context
- Doctor is a TypeScript CLI that publishes Markdown to SharePoint as modern pages
- The project targets **Node 22 LTS** and compiles to CommonJS (ES2022 target)
- SharePoint operations use **CLI for Microsoft 365 v11** (`@pnp/cli-microsoft365`)
- Authentication uses **certificate-based auth** via Azure AD (Entra ID) app registration with `Sites.Selected` permissions

## Known Patterns

### `--password` flag with no value
The CLI for Microsoft 365 `--password` flag is intentionally passed **without a value** when using PFX certificates created with an empty password (`openssl ... -passout pass:`). This is required — omitting the flag entirely causes a PKCS#12 MAC verification failure. Do not flag this as an issue.

### ESM-style imports in CJS
Some imports use ESM default import syntax (e.g. `import hljs from 'highlight.js'`). The project compiles to CommonJS but these work at runtime due to Node's CJS/ESM interop. The `tsconfig.json` does not enable `esModuleInterop` — this is intentional and tested.

### Shell command construction
Doctor builds CLI commands as strings and executes them via `child_process.exec`. Argument values are wrapped in double quotes by `ArgumentsHelper`. This is the established pattern from the upstream project.

## E2E Testing
- Tests use **Vitest** with **cheerio** to validate published SharePoint page content via API
- No browser sessions — all assertions are against page HTML fetched via CLI for M365 commands
- The `localm365` binary is an ESM bridge to the CLI for M365 package
