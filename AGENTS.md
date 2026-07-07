# AGENTS.md — release-agent-sentinel

## Purpose

A small TypeScript CLI that watches upstream releases (GitHub releases or npm
dist-tags), dedupes by a hidden issue marker, and opens downstream
compatibility-review issues seeded with an AI-agent prompt (e.g. `@codex`).
Detection is cheap polling; the expensive AI work starts only after an issue is opened.

## Stack

Node.js + TypeScript. Config-driven runs via YAML (see `examples/`).

## Build / test / run

```bash
npm install
npm run build       # tsc -p tsconfig.json
npm run check       # tsc --noEmit
npm test            # build + node --test dist/**/*.test.js
npm run dry-run:remnic-openclaw   # example run with --dry-run
```

CLI entrypoint: `dist/src/cli.js` (bin: `release-agent-sentinel`), e.g.
`node dist/src/cli.js run --config examples/<name>.yml [--dry-run]`.

## Key directories

- `src/` — CLI and watcher logic (TypeScript).
- `examples/` — sample watch configs (YAML).
- `test/` — tests (compiled to `dist/**/*.test.js`).
- `docs/` — usage and design notes.

## Boundaries

- Keep detection cheap and side-effect-free; only issue creation should mutate remote state.
- No tokens/secrets in commits — GitHub/npm credentials come from the environment.

## Status

Active (last activity 2026-05-04).
