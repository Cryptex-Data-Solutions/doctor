# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Doctor is a TypeScript CLI tool that publishes Markdown documentation to SharePoint as modern pages. It works like a static site generator but creates SharePoint pages instead of HTML files. It uses [CLI for Microsoft 365](https://pnp.github.io/cli-microsoft365/) (`@pnp/cli-microsoft365`) under the hood for all SharePoint operations.

**Package:** `@estruyf/doctor` (npm, public)
**Documentation:** [getdoctor.io](https://getdoctor.io) | [beta.getdoctor.io](https://beta.getdoctor.io)

## Build & Development Commands

```bash
npm run build          # Clean dist/ and compile TypeScript
npm run watch          # Watch mode (resets debug config)
npm run watch:debug    # Watch mode (enables debug config)
npm run clean          # Remove dist/, mochawesome-report, cypress artifacts
```

Output goes to `dist/` (CommonJS, ES6 target).

## Testing

Tests are E2E only, using Cypress 6.7.1 against a live SharePoint environment. There are no unit tests.

```bash
npm test               # Opens Cypress interactive runner
npm run test:e2e       # Same as above
npm run test:e2e:run   # Headless run with Edge browser
```

Run a single test spec:
```bash
npx cypress run --spec cypress/integration/<spec-name>.ts
```

Tests require SharePoint authentication credentials configured via `cypress.json` (create from `cypress.sample.json`). The custom `cy.visitSP()` command handles authentication via the `cypress/plugins/node-auth/` plugin.

## Architecture

### Entry Flow

```
bin/doctor → esm loader → src/cli.ts → src/main.ts (Commands.start)
```

`cli.ts` loads config via `OptionsHelper`, parses CLI args, prompts for missing values, then dispatches to the command router in `main.ts`.

### Commands (`src/commands/`)

- **publish** — Main workflow: authenticate → process markdown → create/update SharePoint pages → update navigation
- **init** — Scaffold a new doctor project
- **version** — Display version info
- **setup/cleanup** — Shell autocomplete management

### Key Helpers (`src/helpers/`)

The core logic lives in helpers, not commands:

- **OptionsHelper** — CLI argument parsing, `doctor.json` config loading, default values
- **DoctorTranspiler** — Converts Markdown to SharePoint web part JSON format (the core transpilation engine)
- **MarkdownHelper** — Discovers and loads markdown files from the project
- **FrontMatterHelper** — Parses YAML front matter from markdown files
- **PagesHelper** — SharePoint page CRUD (create, update, publish pages)
- **NavigationHelper** — Updates SharePoint site navigation/menus
- **MultilingualHelper** — Multi-language page support
- **ShortcodesHelpers** — Custom markdown shortcode rendering (callouts, icons)
- **Authenticate** — Handles deviceCode, password, and certificate auth flows
- **CliCommand** — Wrapper around CLI for Microsoft 365 command execution

### Models (`src/models/`)

TypeScript interfaces for all data structures: `CommandArguments`, `Page`, `PageFrontMatter`, `MarkdownSettings`, `Menu`, `Control` (SharePoint web parts), etc.

### Configuration

Users configure doctor via `doctor.json` in their project root. Schema versions are in `schema/` (current: `1.2.1.json`). Key settings: `url`, `auth`, `folder`, `library`, `menu`, `markdown` (allowHtml, theme, tocLevels), `multilingual`.

## Pre-commit Hooks

Husky runs two scripts on pre-commit:
1. `scripts/prepare-changelog.js` — Auto-generates changelog entries
2. `scripts/reset-debug.js` — Resets debug configuration

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- **test-build.yml** — PR validation (build on Node 14)
- **release.yml** — Full pipeline: cross-platform testing (Ubuntu, macOS, Windows with cmd/PowerShell), E2E with Cypress, auto-publish to npm on success

## Key Technical Details

- Uses `esm` package for ES module support in the bin entry points
- Markdown processing chain: `markdown-it` with plugins for anchors, TOC, and shortcodes
- HTML manipulation via `cheerio`, CSS minification via `clean-css`, code highlighting via `highlight.js`
- Telemetry via Application Insights (`TelemetryHelper`)
- TypeScript config: `strictNullChecks: false`, `noUnusedLocals: true`
