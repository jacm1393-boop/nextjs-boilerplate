export type ToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export const tools: ToolDefinition[] = [
  {
    type: "function",
    name: "get_current_time",
    description: "Get the current server time in ISO 8601 format.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "calculate",
    description: "Evaluate a basic arithmetic expression using numbers and +, -, *, /, %, parentheses.",
    parameters: {
      type: "object",
      properties: { expression: { type: "string", description: "Arithmetic expression." } },
      required: ["expression"],
      additionalProperties: false,
    },
  },
];

export async function executeTool(name: string, args: Record<string, unknown>) {
  if (name === "get_current_time") return { iso: new Date().toISOString() };

  if (name === "calculate") {
    const expression = String(args.expression ?? "").trim();
    if (!/^[0-9+\-*/%.()\s]+$/.test(expression)) throw new Error("Only basic arithmetic is allowed.");
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${expression})`)();
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid calculation.");
    return { expression, value };
  }

  throw new Error(`Unknown tool: ${name}`);
}
