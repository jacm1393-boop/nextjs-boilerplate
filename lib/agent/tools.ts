export type AgentTool = {
  name: string;
  description: string;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

export const tools: AgentTool[] = [
  {
    name: "current_time",
    description: "Get the current server time.",
    execute: async () => ({ now: new Date().toISOString() }),
  },
  {
    name: "calculate",
    description: "Calculate a basic arithmetic expression using numbers and + - * / ( ).",
    execute: async ({ expression }) => {
      if (typeof expression !== "string" || !/^[0-9+\-*/().\s]+$/.test(expression)) {
        throw new Error("Invalid arithmetic expression.");
      }
      const value = Function(`"use strict"; return (${expression})`)();
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid result.");
      return { expression, value };
    },
  },
];

export function getTool(name: string) {
  return tools.find((tool) => tool.name === name);
}
