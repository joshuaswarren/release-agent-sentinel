# Release Agent Sentinel

Release Agent Sentinel watches upstream releases and opens downstream compatibility-review issues for AI coding agents.

It is intentionally small: detection is cheap polling, and the expensive AI work starts only after an issue is opened with an agent prompt such as `@codex`.

## Why

Some upstream projects release quickly, and downstream integrations need a human or agent to check whether anything changed in plugin APIs, install flows, auth metadata, or runtime contracts.

Release Agent Sentinel turns that into a repeatable issue:

1. Watch upstream GitHub releases or npm dist-tags.
2. Dedupe by a hidden issue marker.
3. Open a downstream GitHub issue.
4. Seed the issue with a focused AI-agent prompt.
5. Optionally post the same prompt as a separate issue comment, which is useful for agent integrations that listen to comments more reliably than issue bodies.

## Quick Start

```bash
npm install
npm run build
npm run dry-run:remnic-openclaw
```

To create issues, provide a token with issue-write access to the target repo:

```bash
GITHUB_TOKEN=ghp_... node dist/src/cli.js run --config examples/remnic-openclaw.yml
```

## GitHub Actions

The included workflow watches OpenClaw for Remnic:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: "17,47 * * * *"
```

Because this repository opens issues in `joshuaswarren/remnic`, add a repository secret named `REMNIC_ISSUES_TOKEN` with permission to create issues in that repo. A fine-grained personal access token scoped only to `joshuaswarren/remnic` issues is enough. A GitHub App installation token is better for shared/organization use.

## Configuration

See [`examples/remnic-openclaw.yml`](examples/remnic-openclaw.yml).

Supported watcher types:

- `github-releases-atom`
- `npm-dist-tag`

## Agent Prompt Pattern

The example opens issues with a prompt like:

```text
@codex Review OpenClaw 2026.5.4-beta.1 for Remnic compatibility.

Compare this upstream release against the current Remnic OpenClaw adapter.
Focus on plugin download/install behavior, ClawHub resolution, openclaw.plugin.json schema,
setup.providers / auth metadata, hooks, memory slot behavior, gateway LLM configuration,
plugin security scanning, and breaking changes in OpenClaw plugin SDK docs.

If Remnic needs changes, open a PR with the minimal fix and verification. If no code
changes are needed, comment with evidence and close this issue.
```

## Notes

- This is polling, not a true upstream webhook. That avoids needing upstream maintainer cooperation.
- Polling does not use AI tokens.
- The agent handoff happens in the issue body through your GitHub-connected agent, such as Codex cloud.

## License

MIT
