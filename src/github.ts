import type { GitHubTargetConfig, IssueDraft } from "./types.js";

export interface GitHubIssue {
  number: number;
  html_url: string;
  title: string;
  state: string;
  body?: string | null;
}

function githubApiBase(): string {
  return process.env.GITHUB_API_URL ?? "https://api.github.com";
}

function githubToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required unless --dry-run is used");
  }
  return token;
}

async function githubFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${githubApiBase()}${path}`, {
    ...init,
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": `Bearer ${githubToken()}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "release-agent-sentinel",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${path} failed: ${response.status} ${response.statusText}\n${text}`);
  }
  return response.json() as Promise<T>;
}

export async function findExistingIssue(
  target: GitHubTargetConfig,
  marker: string,
): Promise<GitHubIssue | undefined> {
  for (let page = 1; page <= 10; page += 1) {
    const issues = await githubFetch<GitHubIssue[]>(
      `/repos/${target.owner}/${target.repo}/issues?state=all&per_page=100&page=${page}`,
    );
    const match = issues.find((issue) => issue.body?.includes(marker));
    if (match) return match;
    if (issues.length < 100) break;
  }

  const query = encodeURIComponent(`repo:${target.owner}/${target.repo} is:issue "${marker}"`);
  const result = await githubFetch<{ items: GitHubIssue[] }>(`/search/issues?q=${query}`);
  return result.items[0];
}

export async function createIssue(
  target: GitHubTargetConfig,
  draft: IssueDraft,
): Promise<GitHubIssue> {
  return githubFetch<GitHubIssue>(`/repos/${target.owner}/${target.repo}/issues`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: draft.title,
      body: draft.body,
      labels: draft.labels,
    }),
  });
}

export async function createIssueComment(
  target: GitHubTargetConfig,
  issueNumber: number,
  body: string,
): Promise<{ html_url: string }> {
  return githubFetch<{ html_url: string }>(`/repos/${target.owner}/${target.repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
}
