import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { SentinelConfig, WatcherConfig } from "./types.js";

function assertString(value: unknown, pathName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${pathName} must be a non-empty string`);
  }
  return value;
}

function assertStringArray(value: unknown, pathName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${pathName} must be an array of strings`);
  }
  return value;
}

function optionalString(value: unknown, pathName: string): string | undefined {
  if (value === undefined) return undefined;
  return assertString(value, pathName);
}

function optionalStringArray(value: unknown, pathName: string): string[] | undefined {
  if (value === undefined) return undefined;
  return assertStringArray(value, pathName);
}

function validateWatcher(raw: unknown, index: number): WatcherConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`watchers[${index}] must be an object`);
  }
  const watcher = raw as Record<string, unknown>;
  const type = assertString(watcher.type, `watchers[${index}].type`);
  const base = {
    id: assertString(watcher.id, `watchers[${index}].id`),
    sourceName: assertString(watcher.sourceName, `watchers[${index}].sourceName`),
    title: optionalString(watcher.title, `watchers[${index}].title`),
    bodyIntro: optionalString(watcher.bodyIntro, `watchers[${index}].bodyIntro`),
    agentPrompt: optionalString(watcher.agentPrompt, `watchers[${index}].agentPrompt`),
    labels: optionalStringArray(watcher.labels, `watchers[${index}].labels`),
    dedupeKey: optionalString(watcher.dedupeKey, `watchers[${index}].dedupeKey`),
  };

  if (type === "github-releases-atom") {
    const feedUrl = assertString(watcher.feedUrl, `watchers[${index}].feedUrl`);
    if (watcher.maxEntries !== undefined) {
      const maxEntries = watcher.maxEntries;
      if (!Number.isInteger(maxEntries) || Number(maxEntries) < 1) {
        throw new Error(`watchers[${index}].maxEntries must be a positive integer`);
      }
    }
    return {
      ...base,
      type,
      feedUrl,
      upstreamRepo: optionalString(watcher.upstreamRepo, `watchers[${index}].upstreamRepo`),
      maxEntries: watcher.maxEntries as number | undefined,
      includePrereleases: typeof watcher.includePrereleases === "boolean"
        ? watcher.includePrereleases
        : undefined,
      versionPattern: optionalString(watcher.versionPattern, `watchers[${index}].versionPattern`),
    };
  }

  if (type === "npm-dist-tag") {
    return {
      ...base,
      type,
      packageName: assertString(watcher.packageName, `watchers[${index}].packageName`),
      distTags: assertStringArray(watcher.distTags, `watchers[${index}].distTags`),
    };
  }

  throw new Error(`watchers[${index}].type is unsupported: ${type}`);
}

export function loadConfig(configPath: string): SentinelConfig {
  const resolvedPath = path.resolve(configPath);
  const raw = fs.readFileSync(resolvedPath, "utf8");
  const parsed = YAML.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("config must parse to an object");
  }

  const config = parsed as Record<string, unknown>;
  const target = config.target as Record<string, unknown> | undefined;
  const github = target?.github as Record<string, unknown> | undefined;
  if (!github || typeof github !== "object") {
    throw new Error("target.github is required");
  }
  assertString(github.owner, "target.github.owner");
  assertString(github.repo, "target.github.repo");

  if (!Array.isArray(config.watchers) || config.watchers.length === 0) {
    throw new Error("watchers must be a non-empty array");
  }

  const watchers = config.watchers.map(validateWatcher);
  const defaults = config.defaults && typeof config.defaults === "object" && !Array.isArray(config.defaults)
    ? config.defaults as Record<string, unknown>
    : undefined;

  return {
    target: {
      github: {
        owner: assertString(github.owner, "target.github.owner"),
        repo: assertString(github.repo, "target.github.repo"),
      },
    },
    defaults: defaults ? {
      labels: optionalStringArray(defaults.labels, "defaults.labels"),
      agentMention: optionalString(defaults.agentMention, "defaults.agentMention"),
      title: optionalString(defaults.title, "defaults.title"),
      bodyIntro: optionalString(defaults.bodyIntro, "defaults.bodyIntro"),
      agentPrompt: optionalString(defaults.agentPrompt, "defaults.agentPrompt"),
    } : undefined,
    watchers,
  };
}
