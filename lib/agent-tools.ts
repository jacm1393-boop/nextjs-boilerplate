export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export const agentTools: AgentTool[] = [
  {
    name: "get_time",
    description: "Get the current UTC time.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "calculate",
    description: "Calculate a basic arithmetic expression using numbers, parentheses, +, -, *, /, and %.",
    parameters: {
      type: "object",
      properties: { expression: { type: "string" } },
      required: ["expression"],
      additionalProperties: false,
    },
  },
];

function calculate(expression: string): number {
  if (!/^[0-9+\-*/%().\s]+$/.test(expression)) throw new Error("Only basic arithmetic is allowed.");
  // The character whitelist above prevents identifiers, property access, and function calls.
  return Function(`"use strict"; return (${expression})`)();
}

export async function executeTool(name: string, args: Record<string, unknown>) {
  if (name === "get_time") return { utc: new Date().toISOString() };
  if (name === "calculate") {
    if (typeof args.expression !== "string") throw new Error("expression must be a string");
    return { result: calculate(args.expression) };
  }
  throw new Error(`Unknown tool: ${name}`);
}
