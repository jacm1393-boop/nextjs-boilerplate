import { NextResponse } from "next/server";
import { createIssue, listFiles, readFile, searchCode, writeFile } from "@/lib/github-agent";
import { agentTools, executeTool } from "@/lib/agent-tools";

type Message = { role: "user" | "assistant"; content: string };

const model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
const MAX_STEPS = 10;

const githubTools = [
  { type: "function", name: "github_list_files", description: "List files and directories in the configured GitHub repository.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false }, strict: true },
  { type: "function", name: "github_read_file", description: "Read a text file from the configured GitHub repository.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false }, strict: true },
  { type: "function", name: "github_search", description: "Search code in the configured GitHub repository.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false }, strict: true },
  { type: "function", name: "github_write_file", description: "Create or update a file in the configured GitHub repository. Use only when the user explicitly asks for a code change.", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, message: { type: "string" } }, required: ["path", "content", "message"], additionalProperties: false }, strict: true },
  { type: "function", name: "github_create_issue", description: "Create a GitHub issue when the user explicitly asks to track work as an issue.", parameters: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"], additionalProperties: false }, strict: true },
];

const tools = [{ type: "web_search" }, ...agentTools, ...githubTools];

async function runTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "github_list_files": return listFiles(typeof args.path === "string" ? args.path : "");
    case "github_read_file": return readFile(String(args.path));
    case "github_search": return searchCode(String(args.query));
    case "github_write_file": return writeFile(String(args.path), String(args.content), String(args.message));
    case "github_create_issue": return createIssue(String(args.title), String(args.body));
    default: return executeTool(name, args);
  }
}

export async function POST(request: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    const body = (await request.json()) as { messages?: Message[] };
    const messages = body.messages ?? [];
    if (!messages.length) return NextResponse.json({ error: "A message is required" }, { status: 400 });

    let input: unknown[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const activity: string[] = [];

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          instructions: "You are an autonomous software agent for the configured GitHub repository. Break the user's goal into steps, inspect relevant files before editing, use web search when current external information is needed, use tools iteratively, verify results, and continue until the requested task is complete. Only write files or create issues when the user requested those actions. Never expose secrets. Never deploy, publish, delete important data, or make irreversible changes without explicit approval.",
          input,
          tools,
          tool_choice: "auto",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "OpenAI request failed");

      for (const item of data.output ?? []) {
        if (item.type === "web_search_call") activity.push("web search");
      }
      const calls = (data.output ?? []).filter((item: { type?: string }) => item.type === "function_call");
      if (!calls.length) return NextResponse.json({ provider: "openai", model, content: data.output_text ?? "No response returned.", steps: step + 1, activity });

      input = [...input, ...data.output];
      for (const call of calls) {
        activity.push(call.name);
        let result: unknown;
        try { result = await runTool(call.name, JSON.parse(call.arguments ?? "{}")); }
        catch (error) { result = { error: error instanceof Error ? error.message : "Tool execution failed" }; }
        input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
      }
    }

    return NextResponse.json({ provider: "openai", model, content: `The agent reached its ${MAX_STEPS}-step execution limit and stopped safely.`, steps: MAX_STEPS, activity }, { status: 408 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent request failed" }, { status: 500 });
  }
}
