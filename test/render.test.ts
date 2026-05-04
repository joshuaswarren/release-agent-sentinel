import test from "node:test";
import assert from "node:assert/strict";
import { renderIssue, testExports } from "../src/render.js";
import type { ReleaseCandidate, SentinelConfig, WatcherConfig } from "../src/types.js";

const config: SentinelConfig = {
  target: {
    github: {
      owner: "example",
      repo: "downstream",
    },
  },
  defaults: {
    agentMention: "@codex",
    labels: ["compatibility"],
  },
  watchers: [],
};

const watcher: WatcherConfig = {
  id: "upstream-releases",
  type: "github-releases-atom",
  sourceName: "Upstream",
  feedUrl: "https://example.com/releases.atom",
  title: "Review {sourceName} {version}",
  dedupeKey: "upstream:{version}",
  labels: ["agent-review"],
};

const candidate: ReleaseCandidate = {
  watchId: "upstream-releases",
  sourceType: "github-releases-atom",
  sourceName: "Upstream",
  version: "1.2.3-beta.1",
  channel: "prerelease",
  title: "Upstream 1.2.3-beta.1",
  url: "https://example.com/releases/1.2.3-beta.1",
  upstreamRepo: "example/upstream",
};

test("renderIssue includes stable dedupe marker and unique labels", () => {
  const draft = renderIssue(config, watcher, candidate);
  assert.equal(draft.title, "Review Upstream 1.2.3-beta.1");
  assert.deepEqual(draft.labels, ["compatibility", "agent-review"]);
  assert.match(draft.body, /<!-- release-agent-sentinel:/);
  assert.match(draft.body, /release-agent-sentinel:upstream:1\.2\.3-beta\.1/);
  assert.match(draft.body, /@codex Review Upstream 1\.2\.3-beta\.1/);
});

test("interpolate leaves unknown placeholders empty", () => {
  assert.equal(
    testExports.interpolate("{sourceName}:{version}:{missing}", candidate, "marker"),
    "Upstream:1.2.3-beta.1:",
  );
});
