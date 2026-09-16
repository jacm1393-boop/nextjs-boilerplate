# AgentOS

A Next.js multi-model AI agent workspace with one chat UI for OpenAI, Claude, and Gemini.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add at least one provider API key to `.env.local`:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

Optional model variables let you change the default models without changing code.

## Architecture

- `app/page.tsx` — agent workspace UI and provider selector
- `app/api/agent/route.ts` — server-side provider adapter
- `.env.example` — environment configuration template

API keys stay server-side and are never sent to the browser.
