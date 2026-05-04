# Remnic/OpenClaw Setup

The included example watches OpenClaw releases and npm dist-tags, then opens Remnic compatibility-review issues with `@codex` prompts.

## Secret Required

The workflow runs in `joshuaswarren/release-agent-sentinel`, but it opens issues in `joshuaswarren/remnic`.

GitHub's default `GITHUB_TOKEN` is scoped to the repository running the workflow, so it cannot create issues in `remnic`.

Add this repository secret:

- `REMNIC_ISSUES_TOKEN`: token with issue-write access to `joshuaswarren/remnic`

Recommended token shape:

- Fine-grained personal access token
- Repository access: `joshuaswarren/remnic` only
- Permissions: Issues read/write, Metadata read

For long-lived/shared deployments, prefer a small GitHub App installed on the target repository with issue-write permission.

## Manual Test

After adding the secret, run the workflow manually from GitHub Actions:

```text
Watch Remnic/OpenClaw compatibility -> Run workflow
```

The first real run may open issues for the latest currently observed OpenClaw release and npm dist-tags. Future runs dedupe using hidden issue markers.
