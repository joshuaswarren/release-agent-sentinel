import type { IssueDraft, ReleaseCandidate, SentinelConfig, WatcherConfig } from "./types.js";

function normalizeMarkerKey(key: string): string {
  return key.trim().replace(/\s+/g, "-");
}

function markerFor(watcher: WatcherConfig, candidate: ReleaseCandidate): string {
  const key = watcher.dedupeKey
    ? interpolate(watcher.dedupeKey, candidate, "")
    : [
    candidate.watchId,
    candidate.sourceType,
    candidate.packageName ?? candidate.upstreamRepo ?? candidate.sourceName,
    candidate.distTag ?? candidate.channel,
    candidate.version,
  ].join(":");
  return `release-agent-sentinel:${normalizeMarkerKey(key)}`;
}

function interpolate(template: string, candidate: ReleaseCandidate, marker: string): string {
  const values: Record<string, string> = {
    marker,
    watchId: candidate.watchId,
    sourceType: candidate.sourceType,
    sourceName: candidate.sourceName,
    version: candidate.version,
    channel: candidate.channel,
    title: candidate.title,
    releaseUrl: candidate.url,
    releasedAt: candidate.releasedAt ?? "",
    upstreamRepo: candidate.upstreamRepo ?? "",
    packageName: candidate.packageName ?? "",
    distTag: candidate.distTag ?? "",
  };
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, name: string) => {
    return values[name] ?? "";
  });
}

function watcherString(watcher: WatcherConfig, key: "title" | "bodyIntro" | "agentPrompt"): string | undefined {
  return watcher[key];
}

export function renderIssue(
  config: SentinelConfig,
  watcher: WatcherConfig,
  candidate: ReleaseCandidate,
): IssueDraft {
  const marker = markerFor(watcher, candidate);
  const defaultTitle = "Review {sourceName} {version} compatibility";
  const defaultIntro =
    "Release Agent Sentinel detected a new upstream release that may require downstream compatibility work.";
  const defaultPrompt =
    "{agentMention} Review {sourceName} {version} for downstream compatibility. If changes are needed, open a PR. If no changes are needed, comment with evidence and close this issue.";
  const agentMention = config.defaults?.agentMention ?? "@codex";

  const templateValuesCandidate = { ...candidate };
  const title = interpolate(
    watcherString(watcher, "title") ?? config.defaults?.title ?? defaultTitle,
    templateValuesCandidate,
    marker,
  );
  const intro = interpolate(
    watcherString(watcher, "bodyIntro") ?? config.defaults?.bodyIntro ?? defaultIntro,
    templateValuesCandidate,
    marker,
  );
  const promptTemplate = (
    watcherString(watcher, "agentPrompt") ??
    config.defaults?.agentPrompt ??
    defaultPrompt
  ).replaceAll("{agentMention}", agentMention);
  const prompt = interpolate(promptTemplate, templateValuesCandidate, marker);
  const labels = [
    ...(config.defaults?.labels ?? []),
    ...(watcher.labels ?? []),
  ].filter((label, index, all) => all.indexOf(label) === index);

  const body = [
    `<!-- ${marker} -->`,
    intro,
    "",
    "## Upstream Release",
    "",
    `- Source: ${candidate.sourceName}`,
    `- Version: ${candidate.version}`,
    `- Channel: ${candidate.channel}`,
    candidate.upstreamRepo ? `- Upstream repo: ${candidate.upstreamRepo}` : undefined,
    candidate.packageName ? `- Package: ${candidate.packageName}` : undefined,
    candidate.distTag ? `- npm dist-tag: ${candidate.distTag}` : undefined,
    candidate.releasedAt ? `- Released at: ${candidate.releasedAt}` : undefined,
    candidate.url ? `- URL: ${candidate.url}` : undefined,
    "",
    "## Agent Prompt",
    "",
    prompt,
    "",
    "## Sentinel Metadata",
    "",
    `- Watcher: ${candidate.watchId}`,
    `- Marker: \`${marker}\``,
  ].filter((line): line is string => line !== undefined).join("\n");

  return {
    marker,
    title,
    body,
    labels,
    triggerComment: config.defaults?.postAgentPromptComment === true ? prompt : undefined,
  };
}

export const testExports = {
  interpolate,
  markerFor,
};
