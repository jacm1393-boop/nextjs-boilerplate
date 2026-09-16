"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<string[]>([]);

  async function sendMessage() {
    const content = message.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setMessage("");
    setActivity([]);
    setLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();
      setActivity(data.activity ?? []);
      if (!response.ok) throw new Error(data.error ?? "Agent request failed");
      setMessages((current) => [...current, { role: "assistant", content: data.content }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        content: error instanceof Error ? error.message : "Something went wrong.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="agent-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>AgentOS</span></div>
        <button className="new-chat" onClick={() => { setMessages([]); setActivity([]); }}>+ New task</button>
        <div className="sidebar-section"><span>WORKSPACE</span><button>▣ Tasks</button><button>◫ History</button><button>⚙ Settings</button></div>
        <div className="sidebar-footer"><span className="status-dot" /> Autonomous OpenAI agent</div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">AUTONOMOUS AI WORKSPACE</p><h1>Build Agent</h1></div>
          <div className="provider-picker"><span className="provider active">OpenAI</span></div>
        </header>

        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="hero">
              <div className="hero-icon">✦</div>
              <p className="eyebrow">OPENAI AGENT</p>
              <h2>What should I build?</h2>
              <p>Give the agent a goal. It can reason through steps, search the web, inspect your GitHub repository, and make requested code changes.</p>
              <div className="suggestions">
                {["Build a SaaS dashboard", "Review my GitHub project", "Create an API endpoint", "Plan an automation"].map((item) => <button key={item} onClick={() => setMessage(item)}>{item} <span>→</span></button>)}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((item, index) => <div className={item.role === "user" ? "message user" : "message assistant"} key={`${item.role}-${index}`}><div className="message-label">{item.role === "user" ? "YOU" : "OPENAI"}</div><div className="message-content">{item.content}</div></div>)}
              {loading && <div className="message assistant"><div className="message-label">OPENAI · WORKING</div><div className="typing"><i /><i /><i /></div></div>}
              {!loading && activity.length > 0 && <div className="activity"><span>AGENT ACTIVITY</span>{activity.map((item, index) => <span className="activity-item" key={`${item}-${index}`}>✓ {item}</span>)}</div>}
            </div>
          )}
        </div>

        <form className="composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Give the agent a goal..." rows={3} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
          <div className="composer-footer"><span>OpenAI · gpt-5.6-luna · up to 10 tool steps</span><button type="submit" disabled={loading || !message.trim()}>{loading ? "Working…" : "Run agent ↑"}</button></div>
        </form>
      </section>
    </main>
  );
}
