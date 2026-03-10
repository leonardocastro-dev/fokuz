# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Dev server on port 3000
pnpm build            # Production build
pnpm lint             # ESLint
pnpm typecheck        # TypeScript checking
pnpm prettier         # Check formatting
pnpm prettier:fix     # Fix formatting
pnpm deploy           # Full CI: prettier + lint + typecheck + build
```

Firebase Cloud Functions (separate project in `functions/`):
```bash
cd functions && npm run build    # Compile TypeScript
cd functions && npm run serve    # Build + start Firebase emulators
```

No automated test suite exists. Validate changes with `pnpm lint` and `pnpm typecheck`.

## Architecture

Nuxt 3 app with Firebase backend (Firestore + Auth). Uses pnpm. SSR is disabled for all workspace routes (`/:workspace/**`); landing and auth pages are SSR-enabled.

**Data flow:** Client reads go directly to Firestore (secured by `firestore.rules`). All mutations go through Nitro server routes in `server/api/` which validate permissions via `server/utils/permissions.ts` before writing to Firestore.

**Dual mode:** All Pinia stores support authenticated (Firebase) and guest (localStorage) modes.

### Key layers

- **`stores/`** — 3 Pinia stores by domain: `workspaces.ts`, `projects.ts`, `tasks.ts`. Tasks store uses multi-project caching keyed by projectId with optimistic updates and rollback.
- **`composables/`** — `useAuth.ts` (singleton auth state), `useWorkspace.ts` (workspace context from store or route), `useMembers.ts`, `useProjectPermissions.ts` (permission resolution/caching).
- **`server/api/`** — Nitro routes organized by domain (auth, workspaces, projects, tasks, members, invite). Filenames match endpoint paths (e.g., `server/api/tasks/[taskId].patch.ts`).
- **`server/utils/`** — `firebase-admin.ts` (admin SDK init), `permissions.ts` (server-side permission enforcement).
- **`constants/permissions.ts`** — Role hierarchy (Owner > Admin > Member) and permission implications (e.g., `manage-projects` implies create/edit/delete).
- **`components/ui/`** — Shadcn-vue (New York style, Reka UI base, Lucide icons). Add new components via `npx shadcn-vue@latest add <component>`.
- **`functions/`** — Separate Firebase Functions TypeScript project with its own `package.json` and `tsconfig.json`.

### UI stack

- TailwindCSS 4 via Vite plugin (not PostCSS)
- Shadcn-vue with `components.json` config: New York style, slate base color, CSS variables, no prefix
- `lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- Form validation: Vee-Validate + Zod
- Notifications: vue-sonner

## Code Style

- Prettier: single quotes, no semicolons, no trailing commas
- ESLint: `@typescript-eslint/no-explicit-any` off, `vue/html-self-closing` off, `vue/require-default-prop` off
- Vue SFCs and components use PascalCase
- Composables use `useXxx.ts` naming
- Commit messages: concise imperative subjects (e.g., `Fix add progress bar`)
