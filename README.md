# AgentOS

A Next.js autonomous software agent powered by OpenAI and connected to a configured GitHub repository.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure:

- `OPENAI_API_KEY` — your OpenAI API key.
- `OPENAI_MODEL` — optional model override; defaults to `gpt-5`.
- `GITHUB_TOKEN` — a GitHub token with access to the target repository.
- `GITHUB_OWNER` — repository owner.
- `GITHUB_REPO` — repository name.
- `GITHUB_BRANCH` — branch the agent should work on.

Keep `.env.local` private. Secrets are server-side only and are never sent to the browser.

## Agent capabilities

The OpenAI agent can iteratively:

1. Inspect repository directories.
2. Read source files.
3. Search repository code.
4. Create or update files when the user explicitly asks for code changes.
5. Create GitHub issues when requested.
6. Continue tool calls for up to 8 execution steps before returning a progress message.

## Architecture

- `app/page.tsx` — OpenAI agent workspace UI.
- `app/api/agent/route.ts` — OpenAI Responses API + autonomous tool loop.
- `lib/github-agent.ts` — server-side GitHub tool layer.
- `.env.example` — environment configuration template.
