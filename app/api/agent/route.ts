import { NextResponse } from "next/server";
import { createIssue, listFiles, readFile, searchCode, writeFile } from "@/lib/github-agent";
import { executeTool } from "@/lib/agent-tools";

type Message = { role: "user" | "assistant"; content: string };

const model = process.env.OPENAI_MODEL ?? "gpt-5";

const tools = [
  { type: "function", name: "get_time", description: "Get the current UTC time.", parameters: { type: "object", properties: {}, additionalProperties: false } },
  { type: "function", name: "calculate", description: "Calculate basic arithmetic. Allowed operators: +, -, *, /, %, parentheses.", parameters: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"], additionalProperties: false } },
  { type: "function", name: "github_list_files", description: "List files and directories in the configured GitHub repository.", parameters: { type: "object", properties: { path: { type: "string" } }, additionalProperties: false } },
  { type: "function", name: "github_read_file", description: "Read a text file from the configured GitHub repository.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false } },
  { type: "function", name: "github_search", description: "Search code in the configured GitHub repository.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } },
  { type: "function", name: "github_write_file", description: "Create or update a file in the configured GitHub repository. Use only when the user explicitly asks for a code change.", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, message: { type: "string" } }, required: ["path", "content", "message"], additionalProperties: false } },
  { type: "function", name: "github_create_issue", description: "Create a GitHub issue when the user explicitly asks to track work as an issue.", parameters: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"], additionalProperties: false } },
];

async function runTool(name: string, args: Record<string, unknown>) {
  if (name === "get_time" || name === "calculate") return executeTool(name, args);
  switch (name) {
    case "github_list_files": return listFiles(typeof args.path === "string" ? args.path : "");
    case "github_read_file": return readFile(String(args.path));
    case "github_search": return searchCode(String(args.query));
    case "github_write_file": return writeFile(String(args.path), String(args.content), String(args.message));
    case "github_create_issue": return createIssue(String(args.title), String(args.body));
    default: throw new Error(`Unknown tool: ${name}`);
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

    for (let step = 0; step < 10; step++) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          instructions: "You are an autonomous software agent for the configured GitHub repository. First inspect relevant files. Plan internally, use tools when needed, and continue until the user's requested task is complete or a tool reports a blocker. Never claim a write succeeded unless the tool returned success. Only write GitHub files when the user explicitly asks you to change/build the project. Do not expose secrets.",
          input,
          tools,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "OpenAI request failed");

      const calls = (data.output ?? []).filter((item: { type?: string }) => item.type === "function_call");
      if (!calls.length) return NextResponse.json({ provider: "openai", model, content: data.output_text ?? "No response returned." });

      input = [...input, ...data.output];
      for (const call of calls) {
        let result: unknown;
        try {
          result = await runTool(call.name, JSON.parse(call.arguments ?? "{}"));
        } catch (error) {
          result = { error: error instanceof Error ? error.message : "Tool execution failed" };
        }
        input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
      }
    }

    return NextResponse.json({ provider: "openai", model, content: "The agent reached its 10-step execution limit. It stopped safely; review the repository state before continuing." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
