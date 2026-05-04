#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { findExistingIssue, createIssue } from "./github.js";
import { renderIssue } from "./render.js";
import { loadCandidates } from "./sources.js";

interface RunOptions {
  configPath: string;
  dryRun: boolean;
}

function usage(): never {
  console.error(`Usage:
  release-agent-sentinel run --config <path> [--dry-run]

Environment:
  GITHUB_TOKEN is required when not using --dry-run.`);
  process.exit(2);
}

function parseArgs(argv: string[]): RunOptions {
  const [command, ...rest] = argv;
  if (command !== "run") usage();
  let configPath = "";
  let dryRun = false;
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--config" || arg === "-c") {
      configPath = rest[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    usage();
  }
  if (!configPath) usage();
  return { configPath, dryRun };
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig(options.configPath);
  let created = 0;
  let skipped = 0;
  const seenMarkers = new Set<string>();

  for (const watcher of config.watchers) {
    const candidates = await loadCandidates(watcher);
    for (const candidate of candidates) {
      const draft = renderIssue(config, watcher, candidate);
      if (seenMarkers.has(draft.marker)) {
        skipped += 1;
        console.log(`Duplicate candidate in this run: ${draft.marker}`);
        continue;
      }
      seenMarkers.add(draft.marker);
      if (options.dryRun) {
        console.log(JSON.stringify({ action: "would-create", title: draft.title, marker: draft.marker }, null, 2));
        continue;
      }

      const existing = await findExistingIssue(config.target.github, draft.marker);
      if (existing) {
        skipped += 1;
        console.log(`Already tracked: #${existing.number} ${existing.html_url}`);
        continue;
      }

      const issue = await createIssue(config.target.github, draft);
      created += 1;
      console.log(`Created issue: #${issue.number} ${issue.html_url}`);
    }
  }

  console.log(`Done. created=${created} skipped=${skipped} dryRun=${options.dryRun}`);
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
