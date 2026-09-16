const githubHeaders = () => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

const repo = () => {
  const owner = process.env.GITHUB_OWNER;
  const name = process.env.GITHUB_REPO;
  if (!owner || !name) throw new Error("GITHUB_OWNER and GITHUB_REPO are not configured.");
  return `${owner}/${name}`;
};

async function github(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...githubHeaders(), ...(init?.headers ?? {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? `GitHub request failed (${response.status})`);
  return data;
}

export const toolDefinitions = [
  {
    type: "function" as const,
    name: "github_list_files",
    description: "List files and directories in the configured GitHub repository. Use this to inspect project structure before changing code.",
    parameters: { type: "object", properties: { path: { type: "string", description: "Directory path, empty string for repository root." } }, required: ["path"], additionalProperties: false },
    strict: true,
  },
  {
    type: "function" as const,
    name: "github_read_file",
    description: "Read a text file from the configured GitHub repository.",
    parameters: { type: "object", properties: { path: { type: "string" }, ref: { type: ["string", "null"] } }, required: ["path", "ref"], additionalProperties: false },
    strict: true,
  },
  {
    type: "function" as const,
    name: "github_search_code",
    description: "Search code in the configured GitHub repository.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
    strict: true,
  },
  {
    type: "function" as const,
    name: "github_create_issue",
    description: "Create a GitHub issue. This is a write action and requires explicit approval from the user.",
    parameters: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"], additionalProperties: false },
    strict: true,
  },
] as const;

export async function executeTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "github_list_files": {
      const path = typeof args.path === "string" ? args.path : "";
      return github(`/repos/${repo()}/contents/${path}`);
    }
    case "github_read_file": {
      const path = typeof args.path === "string" ? args.path : "";
      const ref = typeof args.ref === "string" && args.ref ? `?ref=${encodeURIComponent(args.ref)}` : "";
      const data = await github(`/repos/${repo()}/contents/${path}${ref}`);
      if (Array.isArray(data)) return data;
      if (data.encoding !== "base64" || typeof data.content !== "string") return data;
      return { path, sha: data.sha, content: Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8") };
    }
    case "github_search_code": {
      const query = typeof args.query === "string" ? args.query : "";
      return github(`/search/code?q=${encodeURIComponent(`${query} repo:${repo()}`)}`);
    }
    case "github_create_issue": {
      if (process.env.AGENT_REQUIRE_APPROVAL !== "false") return { approval_required: true, action: "github_create_issue", args };
      return github(`/repos/${repo()}/issues`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: args.title, body: args.body }) });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
