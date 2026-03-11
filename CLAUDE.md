# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm typecheck        # TypeScript checking
pnpm prettier         # Check formatting
pnpm prettier:fix     # Fix formatting
pnpm deploy           # Full pipeline: prettier + lint + typecheck + build
```

No test framework is configured. Validate with `pnpm deploy`.

## Architecture

Nuxt 3 app with Firebase backend (Firestore + Auth). SSR is enabled for landing/auth pages but disabled for all workspace routes (`/:workspace/**`).

### Data Flow

- **Reads**: Client reads Firestore directly via Firebase SDK (stores/composables)
- **Writes**: All mutations go through Nitro server routes (`server/api/`) which validate permissions via `server/utils/permissions.ts` before writing to Firestore with firebase-admin
- **Guest mode**: Stores support dual mode — Firebase for authenticated users, localStorage for guests

### Firestore Structure

```
workspaces/{id}/members/{userId}              # role, permissions
workspaces/{id}/projects/{id}/members/{userId} # project-level role/permissions
workspaces/{id}/tasks/{id}                     # tasks belong to workspace, reference projectId
users/{uid}                                    # public profile
users_private/{uid}                            # private data (email)
invites/{id}                                   # workspace invitations
```

### Permission System

Three workspace roles: **owner > admin > member**. Owner/admin bypass all permission checks.

Members have granular permissions at two scopes:
- **Workspace**: manage-projects, create/edit/delete-projects, manage-members, add/remove-members, assign-project
- **Project**: manage-tasks, create/edit/delete-tasks, toggle-status

Parent permissions imply children (e.g., `manage-tasks` implies `create-tasks`, `edit-tasks`, `delete-tasks`, `toggle-status`). Project admins get all project permissions.

Core logic: `constants/permissions.ts` (shared helpers) + `server/utils/permissions.ts` (server enforcement).

### State Management (Pinia)

- `stores/tasks.ts` — Multi-project task caching with projectId-keyed buckets, optimistic updates with rollback, scope/status/priority/date client-side filtering
- `stores/projects.ts` — Project CRUD, member role/permissions tracking, guest mode support
- `stores/workspaces.ts` — Workspace CRUD and member management

### Key Composables

- `useAuth` — Singleton Firebase auth state, login/register/profile sync
- `useWorkspace` — Resolves current workspace from store or route
- `useMembers` — Loads workspace/project members with caching
- `useProjectPermissions` — Resolves and caches project-level permissions

### UI Stack

Shadcn-vue (New York style, Reka UI) + TailwindCSS 4 + Lucide icons + Vue Sonner toasts. Form validation with Vee-Validate + Zod.

## Code Style

- Prettier: no semicolons, single quotes, no trailing commas
- ESLint: `@typescript-eslint/no-explicit-any` is off, `vue/html-self-closing` is off
- 2-space indentation, LF line endings, UTF-8
- PascalCase for Vue components, `useXxx.ts` for composables
- Respond in the same language as the user (Portuguese or English)
