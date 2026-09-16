"use client";

import { FormEvent, useMemo, useState } from "react";

type Provider = "openai" | "anthropic" | "gemini";
type Message = { role: "user" | "assistant"; content: string };

const providers: { id: Provider; label: string; model: string }[] = [
  { id: "openai", label: "OpenAI", model: "gpt-5" },
  { id: "anthropic", label: "Claude", model: "claude-sonnet-4-5" },
  { id: "gemini", label: "Gemini", model: "gemini-2.5-pro" },
];

export default function Home() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const activeProvider = useMemo(
    () => providers.find((item) => item.id === provider) ?? providers[0],
    [provider],
  );

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Agent request failed");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.content },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="agent-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>AgentOS</span></div>
        <button className="new-chat" onClick={() => setMessages([])}>+ New task</button>
        <div className="sidebar-section"><span>WORKSPACE</span><button>▣ Tasks</button><button>◫ History</button><button>⚙ Settings</button></div>
        <div className="sidebar-footer"><span className="status-dot" /> Multi-model agent</div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">AI WORKSPACE</p><h1>Build Agent</h1></div>
          <div className="provider-picker">
            {providers.map((item) => (
              <button key={item.id} className={provider === item.id ? "provider active" : "provider"} onClick={() => setProvider(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="hero">
              <div className="hero-icon">✦</div>
              <p className="eyebrow">AUTONOMOUS AI</p>
              <h2>What should I build?</h2>
              <p>Give your agent a goal. Choose OpenAI, Claude, or Gemini and let the workspace handle the model connection.</p>
              <div className="suggestions">
                {['Build a SaaS dashboard', 'Review my GitHub project', 'Create an API endpoint', 'Plan an automation'].map((item) => <button key={item} onClick={() => setMessage(item)}>{item} <span>→</span></button>)}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((item, index) => <div className={item.role === "user" ? "message user" : "message assistant"} key={`${item.role}-${index}`}><div className="message-label">{item.role === "user" ? "YOU" : activeProvider.label.toUpperCase()}</div><div className="message-content">{item.content}</div></div>)}
              {loading && <div className="message assistant"><div className="message-label">{activeProvider.label.toUpperCase()}</div><div className="typing"><i /><i /><i /></div></div>}
            </div>
          )}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe what you want the agent to build..." rows={3} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(event); } }} />
          <div className="composer-footer"><span>{activeProvider.label} · {activeProvider.model}</span><button type="submit" disabled={loading || !message.trim()}>{loading ? "Working…" : "Run agent ↑"}</button></div>
        </form>
      </section>
    </main>
  );
}
