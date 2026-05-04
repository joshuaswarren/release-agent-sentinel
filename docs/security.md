# Security

Release Agent Sentinel is designed to avoid executing upstream code.

## Token Scope

Use the smallest token that can create issues in the downstream repository.

For GitHub Actions in the same repository, `GITHUB_TOKEN` with `issues: write` is enough.
For cross-repository issue creation, use a fine-grained token or GitHub App installation token scoped to the target repository.

## Source Handling

Watcher sources fetch metadata only:

- GitHub Atom feed XML
- npm package metadata JSON

The tool does not install upstream packages, run release assets, or execute scripts.

## Dedupe

Each issue includes a hidden marker:

```html
<!-- release-agent-sentinel:... -->
```

Before opening an issue, the tool searches for that marker in the target repository.
