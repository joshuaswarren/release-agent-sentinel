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

GitHub does not expose a REST or CLI endpoint that can mint a fine-grained PAT
from another token. Create it in the browser using this prefilled URL:

```text
https://github.com/settings/personal-access-tokens/new?name=release-agent-sentinel-remnic-issues&description=Issue%20read%2Fwrite%20token%20for%20release-agent-sentinel%20to%20open%20Remnic%20compatibility%20review%20issues&target_name=joshuaswarren&expires_in=90&issues=write&metadata=read
```

After GitHub shows the token, add it to this repository:

```bash
printf '%s' '<paste-token-here>' | gh secret set REMNIC_ISSUES_TOKEN \
  --repo joshuaswarren/release-agent-sentinel \
  --app actions
```

The tool checks for duplicate issues before creating a new one by reading
existing issues in the target repository and looking for the hidden sentinel
marker in the issue body. GitHub issue search is used only as a fallback.

For long-lived/shared deployments, prefer a small GitHub App installed on the target repository with issue-write permission.

## Manual Test

After adding the secret, run the workflow manually from GitHub Actions:

```text
Watch Remnic/OpenClaw compatibility -> Run workflow
```

The first real run may open issues for the latest currently observed OpenClaw release and npm dist-tags. Future runs dedupe using hidden issue markers.
