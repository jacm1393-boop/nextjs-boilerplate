type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
};

type GitHubFile = { path: string; content: string; sha: string };

function config(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) throw new Error("GitHub is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.");
  return { token, owner, repo, branch: process.env.GITHUB_BRANCH ?? "main" };
}

async function github(path: string, init?: RequestInit) {
  const c = config();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${c.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? `GitHub request failed (${response.status})`);
  return data;
}

export async function listFiles(path = "") {
  const c = config();
  const ref = encodeURIComponent(c.branch ?? "main");
  return github(`/repos/${c.owner}/${c.repo}/contents/${path}?ref=${ref}`);
}

export async function readFile(path: string): Promise<GitHubFile> {
  const c = config();
  const ref = encodeURIComponent(c.branch ?? "main");
  const data = await github(`/repos/${c.owner}/${c.repo}/contents/${path}?ref=${ref}`);
  if (Array.isArray(data) || data.type !== "file") throw new Error(`${path} is not a file`);
  return {
    path: data.path,
    sha: data.sha,
    content: Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8"),
  };
}

export async function searchCode(query: string) {
  const c = config();
  return github(`/search/code?q=${encodeURIComponent(`${query}+repo:${c.owner}/${c.repo}`)}`);
}

export async function writeFile(path: string, content: string, message: string) {
  const c = config();
  let sha: string | undefined;
  try { sha = (await readFile(path)).sha; } catch { /* create new file */ }
  const body = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: c.branch ?? "main",
    ...(sha ? { sha } : {}),
  };
  return github(`/repos/${c.owner}/${c.repo}/contents/${path}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function createIssue(title: string, body: string) {
  const c = config();
  return github(`/repos/${c.owner}/${c.repo}/issues`, { method: "POST", body: JSON.stringify({ title, body }) });
}
