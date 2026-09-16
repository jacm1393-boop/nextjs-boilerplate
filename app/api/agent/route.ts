import { NextResponse } from "next/server";

type Message = { role: "user" | "assistant"; content: string };

const model = process.env.OPENAI_MODEL ?? "gpt-5";

export async function POST(request: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });

    const body = (await request.json()) as { messages?: Message[] };
    const messages = body.messages ?? [];
    if (!messages.length) return NextResponse.json({ error: "A message is required" }, { status: 400 });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        input: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "OpenAI request failed");

    const content = data.output_text ?? data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? [])
      .map((item: { text?: string }) => item.text ?? "").join("") ?? "No response returned.";

    return NextResponse.json({ provider: "openai", model, content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
