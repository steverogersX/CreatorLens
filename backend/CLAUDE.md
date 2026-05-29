# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development — hot reload via nodemon + ts-node
npm run dev

# Compile TypeScript → dist/
npm run build

# Run compiled output
npm start
```

## Architecture

- Entry point: `src/index.ts`
- All source lives in `src/`, compiled output goes to `dist/` (never edit `dist/` directly)
- Module system: CommonJS (`"module": "commonjs"`), target ES2020, strict mode on
- Node globals (`console`, `process`, `Buffer`, etc.) come from `@types/node`

## Libraries in Use

| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `zod` | Runtime schema validation and TypeScript type inference |
| `zod-validation-error` | Formats Zod validation errors into readable messages via `fromZodError` |
| `http-status-codes` | Named HTTP status constants — use these instead of raw numbers |
| `ytdlp-nodejs` | yt-dlp wrapper — auto-detects OS and downloads the correct native binary into the project on first use; no global install or PATH setup needed |

## Adapter Pattern

All external data sources (transcript providers, video metadata platforms) must go through an adapter. Never let provider-specific shapes leak into the rest of the app.

### Transcript

- Unified type: `ITranscript` in `src/types/transcript.ts`
- Abstract base: `TranscriptAdapter<TRaw>` in `src/adapters/transcript/base.ts`
- Concrete adapters live in `src/adapters/transcript/<provider>.adapter.ts`
- Existing: `WhisperAdapter` — converts Whisper raw output (`avg_logprob` → confidence via `Math.exp()`, `probability` → word confidence)

### Video Metadata

- Unified type: `IVideoMeta` + `VideoCreator` in `src/types/video-meta.ts`
- Abstract base: `VideoMetaAdapter<TRaw>` in `src/adapters/video-meta/base.ts`
- Concrete adapters live in `src/adapters/video-meta/<provider>.adapter.ts`
- Existing: `YouTubeAdapter` — maps YouTube Data API v3 response; parses ISO 8601 duration to seconds, extracts `#`-prefixed tags as hashtags
- `commentCount` is always a `number` (count metric). A full comment thread system is separate.

### Rules for all adapters

- Extend the abstract base class — never implement the interface directly on a service or controller.
- The `adapt()` method is the only public surface; keep all mapping logic private.
- `fetchedAt` / `createdAt` timestamps use the base class `timestamp()` helper so they're consistent.
- Parse all provider numeric strings (e.g. YouTube's `"12345"`) to `number` inside the adapter — consumers receive proper numbers.

---

## Conventions Agents Must Follow

- **Validation**: Use `zod` schemas for all request body, query, and param validation. Never trust raw `req.body` without parsing.
- **Error formatting**: When a `ZodError` occurs, format it with `fromZodError` from `zod-validation-error` before sending to the client.
- **Status codes**: Always use `StatusCodes` from `http-status-codes` (e.g. `StatusCodes.OK`, `StatusCodes.BAD_REQUEST`) — no magic numbers.
- **Types**: Infer TypeScript types from Zod schemas using `z.infer<typeof Schema>` — do not duplicate type definitions.
- **No `any`**: Strict mode is on. Avoid `any`; use `unknown` and narrow explicitly.

## Git Hygiene

### Branch Names

Pattern: `<type>/<short-description>` using kebab-case.

| Type | When to use |
|---|---|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Code change with no behaviour change |
| `chore/` | Tooling, deps, config |
| `docs/` | Documentation only |

Examples:
- `feat/video-download-endpoint`
- `fix/zod-error-formatting`
- `chore/add-eslint`

### Commit Messages

Format: `<type>(<scope>): <short summary>`

- Summary is lowercase, imperative mood, no period — `add route` not `Added route.`
- Scope is optional but encouraged — use the module or file area (e.g. `auth`, `routes`, `server`)
- Keep the subject line under 72 characters
- If more context is needed, leave a blank line then add a body

Examples:
```
feat(routes): add GET /api/v1/products endpoint
fix(error-handler): format zod errors before sending response
chore(deps): install ytdlp-nodejs and zod-validation-error
refactor(server): extract route registration into registerRoutes
```
