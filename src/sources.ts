import { XMLParser } from "fast-xml-parser";
import type {
  GitHubReleasesAtomWatcherConfig,
  NpmDistTagWatcherConfig,
  ReleaseCandidate,
  WatcherConfig,
} from "./types.js";

const DEFAULT_VERSION_PATTERN = String.raw`v?(\d{4}\.\d+\.\d+(?:[-.][0-9A-Za-z.]+)?)`;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in value) {
    const text = (value as Record<string, unknown>)["#text"];
    return typeof text === "string" ? text : "";
  }
  return "";
}

function extractLink(entry: Record<string, unknown>): string {
  const link = entry.link;
  if (typeof link === "string") return link;
  if (Array.isArray(link)) {
    const alternate = link.find((item) => {
      return item && typeof item === "object" && (item as Record<string, unknown>)["@_rel"] === "alternate";
    });
    if (alternate && typeof alternate === "object") {
      const href = (alternate as Record<string, unknown>)["@_href"];
      return typeof href === "string" ? href : "";
    }
  }
  if (link && typeof link === "object") {
    const href = (link as Record<string, unknown>)["@_href"];
    return typeof href === "string" ? href : "";
  }
  return "";
}

function versionFromTitle(title: string, versionPattern?: string): string {
  const pattern = new RegExp(versionPattern ?? DEFAULT_VERSION_PATTERN, "i");
  const match = title.match(pattern);
  return match?.[1] ?? title.trim();
}

function channelFromVersion(version: string): string {
  return /(?:^|[-.])(?:alpha|beta|rc|next|canary)(?:[-.]|$)/i.test(version)
    ? "prerelease"
    : "stable";
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "accept": "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      "user-agent": "release-agent-sentinel",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function loadGitHubReleasesAtom(
  watcher: GitHubReleasesAtomWatcherConfig,
): Promise<ReleaseCandidate[]> {
  const xml = await fetchText(watcher.feedUrl);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const feed = parsed.feed as Record<string, unknown> | undefined;
  const entries = asArray(feed?.entry as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const maxEntries = watcher.maxEntries ?? 1;

  return entries
    .map((entry) => {
      const title = textValue(entry.title);
      const version = versionFromTitle(title, watcher.versionPattern);
      const channel = channelFromVersion(version);
      const candidate: ReleaseCandidate = {
        watchId: watcher.id,
        sourceType: watcher.type,
        sourceName: watcher.sourceName,
        version,
        channel,
        title,
        url: extractLink(entry),
        releasedAt: textValue(entry.updated) || textValue(entry.published) || undefined,
        upstreamRepo: watcher.upstreamRepo,
        summary: textValue(entry.content) || textValue(entry.summary) || undefined,
      };
      return candidate;
    })
    .filter((candidate) => watcher.includePrereleases !== false || candidate.channel === "stable")
    .slice(0, maxEntries);
}

async function loadNpmDistTags(watcher: NpmDistTagWatcherConfig): Promise<ReleaseCandidate[]> {
  const encodedPackage = encodeURIComponent(watcher.packageName).replace(/^%40/, "@");
  const url = `https://registry.npmjs.org/${encodedPackage}`;
  const response = await fetch(url, {
    headers: {
      "accept": "application/vnd.npm.install-v1+json, application/json",
      "user-agent": "release-agent-sentinel",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const metadata = (await response.json()) as {
    "dist-tags"?: Record<string, string>;
    time?: Record<string, string>;
  };
  const distTags = metadata["dist-tags"] ?? {};

  return watcher.distTags.flatMap((distTag) => {
    const version = distTags[distTag];
    if (!version) return [];
    return [
      {
        watchId: watcher.id,
        sourceType: watcher.type,
        sourceName: watcher.sourceName,
        version,
        channel: distTag,
        title: `${watcher.packageName}@${distTag} -> ${version}`,
        url: `https://www.npmjs.com/package/${watcher.packageName}/v/${version}`,
        releasedAt: metadata.time?.[version],
        packageName: watcher.packageName,
        distTag,
      },
    ];
  });
}

export async function loadCandidates(watcher: WatcherConfig): Promise<ReleaseCandidate[]> {
  if (watcher.type === "github-releases-atom") {
    return loadGitHubReleasesAtom(watcher);
  }
  if (watcher.type === "npm-dist-tag") {
    return loadNpmDistTags(watcher);
  }
  const _exhaustive: never = watcher;
  throw new Error(`Unsupported watcher: ${JSON.stringify(_exhaustive)}`);
}
