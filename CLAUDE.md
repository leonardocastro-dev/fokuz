# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
pnpm dev              # Start Nuxt dev server (HMR, port 3000)
pnpm build            # Production build
pnpm preview          # Preview built app
pnpm lint             # ESLint
pnpm typecheck        # Nuxt/TypeScript type checking
pnpm prettier         # Check formatting
pnpm prettier:fix     # Apply Prettier formatting
pnpm deploy           # Full CI: prettier + lint + typecheck + build
```

Firebase Cloud Functions (separate project in `functions/`):
```bash
cd functions && npm run build    # Compile TypeScript
cd functions && npm run serve    # Build + start emulators
cd functions && npm run deploy   # Deploy to Firebase
```

No automated test suite exists. Validate with `pnpm lint`, `pnpm typecheck`, and manual flow checks.

## Architecture Overview

**Full-stack workspace-based task management app** built with Nuxt 3 + Vue 3 Composition API.

### Stack
- **Frontend:** Vue 3, TailwindCSS 4, Shadcn-vue (Reka UI, New York style), Pinia
- **Backend:** Nitro API routes with Firebase Admin SDK
- **Database:** Firestore (NoSQL) with security rules + composite indexes
- **Auth:** Firebase Authentication (email/password) with guest mode (localStorage fallback)
- **Validation:** Vee-Validate + Zod
- **Email:** Vue Email templates + Resend SDK

### Dual-Mode Architecture
All stores support two modes detected via `useAuth()`:
- **Authenticated:** reads from Firestore, mutations through Nitro API routes
- **Guest:** reads/writes to browser localStorage

### Data Flow Pattern
- **Client reads** go directly to Firestore (secured by `firestore.rules`)
- **All mutations** go through `server/api/` routes which validate permissions server-side before writing to Firestore
- Tasks store implements optimistic updates with rollback on error

### Permission System
Hierarchical roles: **Owner > Admin > Member**, scoped at workspace and project levels.
- Defined in `constants/permissions.ts` (shared) and `server/utils/permissions.ts` (server validation)
- Client-side: `useProjectPermissions()` composable caches computed permissions
- Server-side: validated on every mutation

### Key Composables
- `useAuth()` — Singleton auth state, profile management, guest detection
- `useWorkspace()` — Resolves current workspace from store or route param
- `useMembers()` — Fetches and filters workspace/project members
- `useProjectPermissions()` — Caches project-level permission checks

### Pinia Stores (3 domain stores in `stores/`)
- `workspaces.ts` — Workspace CRUD, current workspace tracking
- `projects.ts` — Project CRUD, member assignment, permission-based filtering via `visibleProjects` getter
- `tasks.ts` — Multi-project task caching (keyed by projectId), scope-aware filtering (all vs assigned), advanced filters

### Routing
- SSR enabled for landing page and auth routes
- SSR disabled for workspace routes (`/:workspace/**`) — client-side real-time
- Single layout `layouts/workspace.vue` for workspace routes
- Dynamic workspace param: `[workspace].vue` wraps all nested routes

### Firebase Cloud Functions
- `syncUserProfileToMembers` — Firestore trigger that syncs profile changes across workspace member records

## Coding Style

- 2-space indentation, single quotes, no semicolons, no trailing commas
- TypeScript preferred in app and server code
- Vue SFC files use PascalCase (`TaskItem.vue`)
- Composables: `useXxx.ts`, stores: grouped by domain
- API route filenames match endpoint paths (e.g., `server/api/tasks/[taskId].patch.ts`)

## Commit Conventions

- Concise, imperative subjects (e.g., `Fix add progress bar`)
- Keep commits focused on one change area
- Review `firestore.rules` and `firestore.indexes.json` when data access patterns change
