import { NextResponse } from "next/server";

type Provider = "openai" | "anthropic" | "gemini";
type Message = { role: "user" | "assistant"; content: string };

const models: Record<Provider, string> = {
  openai: process.env.OPENAI_MODEL ?? "gpt-5",
  anthropic: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
  gemini: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { provider?: Provider; messages?: Message[] };
    const provider = body.provider ?? "openai";
    const messages = body.messages ?? [];

    if (!models[provider]) return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    if (!messages.length) return NextResponse.json({ error: "A message is required" }, { status: 400 });

    const content = await callProvider(provider, messages);
    return NextResponse.json({ provider, model: models[provider], content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function callProvider(provider: Provider, messages: Message[]) {
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured.");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: models.openai, input: messages.map((m) => ({ role: m.role, content: m.content })) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "OpenAI request failed");
    return data.output_text ?? data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? []).map((item: { text?: string }) => item.text ?? "").join("") ?? "No response returned.";
  }

  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured.");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: models.anthropic, max_tokens: 4096, messages: messages.map((m) => ({ role: m.role, content: m.content })) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "Anthropic request failed");
    return data.content?.map((item: { text?: string }) => item.text ?? "").join("") ?? "No response returned.";
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${models.gemini}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "Gemini request failed");
  return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "No response returned.";
}
