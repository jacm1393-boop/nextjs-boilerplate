export const agentTools = [
  {
    type: "function" as const,
    name: "get_time",
    description: "Get the current UTC time.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function" as const,
    name: "calculate",
    description: "Calculate a basic arithmetic expression using numbers, parentheses, +, -, *, /, and %.",
    parameters: {
      type: "object",
      properties: { expression: { type: "string" } },
      required: ["expression"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "fetch_url",
    description: "Fetch a public HTTP or HTTPS URL and return a limited text response.",
    parameters: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
      additionalProperties: false,
    },
    strict: true,
  },
];

function calculate(expression: string): number {
  if (!/^[0-9+\-*/%().\s]+$/.test(expression)) throw new Error("Only basic arithmetic is allowed.");
  const value = Function(`"use strict"; return (${expression})`)();
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid calculation.");
  return value;
}

export async function executeTool(name: string, args: Record<string, unknown>) {
  if (name === "get_time") return { utc: new Date().toISOString() };
  if (name === "calculate") {
    if (typeof args.expression !== "string") throw new Error("expression must be a string");
    return { result: calculate(args.expression) };
  }
  if (name === "fetch_url") {
    const url = new URL(String(args.url ?? ""));
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
    const response = await fetch(url, {
      headers: { Accept: "text/plain,text/html,application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    return { status: response.status, ok: response.ok, content: text.slice(0, 12000) };
  }
  throw new Error(`Unknown tool: ${name}`);
}
