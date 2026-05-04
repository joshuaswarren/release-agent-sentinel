export type SourceType = "github-releases-atom" | "npm-dist-tag";

export interface GitHubTargetConfig {
  owner: string;
  repo: string;
}

export interface BaseWatcherConfig {
  id: string;
  sourceName: string;
  type: SourceType;
  title?: string;
  bodyIntro?: string;
  agentPrompt?: string;
  labels?: string[];
  dedupeKey?: string;
}

export interface GitHubReleasesAtomWatcherConfig extends BaseWatcherConfig {
  type: "github-releases-atom";
  feedUrl: string;
  upstreamRepo?: string;
  maxEntries?: number;
  includePrereleases?: boolean;
  versionPattern?: string;
}

export interface NpmDistTagWatcherConfig extends BaseWatcherConfig {
  type: "npm-dist-tag";
  packageName: string;
  distTags: string[];
}

export type WatcherConfig =
  | GitHubReleasesAtomWatcherConfig
  | NpmDistTagWatcherConfig;

export interface SentinelConfig {
  target: {
    github: GitHubTargetConfig;
  };
  defaults?: {
    labels?: string[];
    agentMention?: string;
    title?: string;
    bodyIntro?: string;
    agentPrompt?: string;
    postAgentPromptComment?: boolean;
  };
  watchers: WatcherConfig[];
}

export interface ReleaseCandidate {
  watchId: string;
  sourceType: SourceType;
  sourceName: string;
  version: string;
  channel: string;
  title: string;
  url: string;
  releasedAt?: string;
  upstreamRepo?: string;
  packageName?: string;
  distTag?: string;
  summary?: string;
}

export interface IssueDraft {
  marker: string;
  title: string;
  body: string;
  labels: string[];
  triggerComment?: string;
}
