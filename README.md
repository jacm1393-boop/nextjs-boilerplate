# AgentOS

A Next.js AI agent workspace powered by OpenAI.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your OpenAI API key to `.env.local`:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional; defaults to `gpt-5`)

The API key is used only by the server-side route and is never sent to the browser.

## Architecture

- `app/page.tsx` — OpenAI agent workspace UI
- `app/api/agent/route.ts` — server-side OpenAI API adapter
- `.env.example` — OpenAI environment configuration template
