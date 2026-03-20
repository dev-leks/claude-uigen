# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Commands

```bash
npm run setup          # First-time setup: install deps, generate Prisma client, run migrations
npm run dev            # Start dev server with Turbopack at http://localhost:3000
npm run build          # Production build
npm run lint           # ESLint
npm test               # Run all Vitest tests
npx vitest run src/path/to/file.test.ts  # Run a single test file
npm run db:reset       # Reset and re-run all migrations (destructive)
```

Set `ANTHROPIC_API_KEY` in `.env` to enable real AI generation. Without it, a `MockLanguageModel` returns static code.

## Architecture

### App Structure

Two routes both render the same `MainContent` component (`src/app/main-content.tsx`):
- `/` — anonymous users only; authenticated users are redirected to their latest project
- `/[projectId]` — authenticated users; loads project data from DB and passes it as initial state

`MainContent` is a two-panel layout (resizable): left panel is the chat interface, right panel toggles between a live preview iframe and a code editor with file tree.

### Context Providers

`FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) wraps a `VirtualFileSystem` instance and exposes file CRUD operations plus a `handleToolCall` function that dispatches AI tool calls into file mutations.

`ChatProvider` (`src/lib/contexts/chat-context.tsx`) wraps the Vercel AI SDK `useChat` hook, serializes the virtual file system on every request, and routes incoming tool calls to `handleToolCall`.

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory tree of `FileNode` objects (never written to disk). It is serialized to JSON and sent with each chat API request, then reconstructed server-side. For authenticated users, the final state is persisted to the `Project.data` column (JSON string) after each AI response.

### Chat API (`src/app/api/chat/route.ts`)

Uses Vercel AI SDK `streamText` with two tools:
- `str_replace_editor` — view/create/str_replace/insert operations on the virtual FS
- `file_manager` — rename/delete operations

The system prompt (`src/lib/prompts/generation.tsx`) instructs the AI to:
- Always create `/App.jsx` as the entry point
- Use `@/` alias for all local imports (e.g., `@/components/Button`)
- Style with Tailwind CSS only

### Live Preview

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) renders an `<iframe>` with `srcdoc`. On each FS change it calls `createImportMap` which:
1. Transforms all `.jsx/.tsx/.ts/.js` files with Babel standalone into browser-compatible ESM
2. Creates blob URLs for each transformed file
3. Builds a native `<script type="importmap">` mapping local imports and resolving third-party packages via `https://esm.sh/`

Entry point lookup order: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.{jsx,tsx}`.

### AI Provider (`src/lib/provider.ts`)

`getLanguageModel()` returns `anthropic("claude-haiku-4-5")` when `ANTHROPIC_API_KEY` is set, otherwise returns a `MockLanguageModel` that streams static component code.

### Authentication

Three layers:

- **Session** (`src/lib/auth.ts`) — Server-only. Signs JWTs with `jose`, stored as `httpOnly` cookies (`auth-token`, 7-day expiry). `getSession()` / `verifySession()` decode the cookie for server components and middleware respectively.
- **Hook** (`src/hooks/use-auth.ts`) — Client-side orchestration. After sign-in/sign-up, `handlePostSignIn` migrates any anonymous `localStorage` work into a new project, then redirects to the most recent project (or creates one).
- **UI** (`src/components/auth/AuthDialog.tsx`) — Radix `Dialog` toggling between `SignInForm` and `SignUpForm`. `defaultMode` is synced via `useEffect` so the dialog resets correctly when reopened.

Anonymous work (messages + FS state) is preserved in `localStorage` via `src/lib/anon-work-tracker.ts` and migrated into a real DB project on first sign-in.

### Database

Prisma with SQLite (`prisma/dev.db`). Client generated to `src/generated/prisma`. The schema is defined in `prisma/schema.prisma` — reference it whenever working with database-related code. Two models:
- `User` — email/password accounts
- `Project` — `messages` (JSON array) and `data` (serialized `VirtualFileSystem`) stored as plain strings; `userId` is optional (null for anonymous sessions)

### Testing

Vitest with `@testing-library/react` and jsdom. Test files are colocated under `__tests__/` directories next to the source files they test.
