# Fokuz/Task Manager - Full-Stack Workspace-Based Task Management

#### Video Demo: https://drive.google.com/file/d/1iVqREYQ-JAqZVSi4AaxzcPlTAY2EG-WZ/view?usp=sharing

#### Description:

Task Manager is a full-stack workspace-based task management application built with Nuxt 3 and Firebase. It features multi-workspace support, project organization, granular role-based permissions, team collaboration with invitations, and a dual mode that supports both authenticated and guest users.

## Project Overview

This application provides a complete task management solution organized around workspaces and projects. Users can create workspaces, invite team members, manage projects with emoji identifiers, and track tasks with statuses, priorities, due dates, and assignees.

The application supports both authenticated and guest modes. Authenticated users benefit from cloud synchronization, team collaboration, and workspace management. Guest users can manage tasks locally via localStorage without registration.

## Technology Stack

- **Framework:** Nuxt 3 with Vue 3 Composition API
- **Styling:** TailwindCSS 4 + Shadcn-vue (Reka UI, New York style)
- **State Management:** Pinia (3 domain-specific stores)
- **Database:** Firestore (NoSQL)
- **Authentication:** Firebase Authentication
- **Validation:** Vee-Validate + Zod
- **Email:** Vue Email templates + Resend
- **Cloud Functions:** Firebase Functions (profile sync)
- **Icons:** Lucide Vue Next
- **Package Manager:** pnpm

## Data Model

```
workspaces/{id}
  ├── members/{userId}          # role, permissions
  ├── projects/{id}             # title, emoji, assigneeIds[]
  │     └── members/{userId}    # project-level assignments
  ├── tasks/{id}                # status, priority, dueDate, projectId, assigneeIds[]

users/{uid}                     # public profile (username, avatar)
users_private/{uid}             # private data (email)
invites/{id}                    # workspace invitations
```

## Routing

File-based routing via Nuxt. The landing page and auth pages are SSR-enabled. Workspace routes (`/:workspace/**`) have SSR disabled for client-side real-time interactions.

| Route                       | Description               |
| --------------------------- | ------------------------- |
| `/`                         | Landing page              |
| `/login`                    | Login                     |
| `/register`                 | Registration              |
| `/forgot-password`          | Password recovery         |
| `/settings`                 | User profile settings     |
| `/workspaces`               | Workspace list            |
| `/invite/[token]`           | Invite acceptance         |
| `/:workspace/tasks`         | Task management           |
| `/:workspace/members`       | Member management         |
| `/:workspace/projects`      | Project list              |
| `/:workspace/projects/[id]` | Project detail with tasks |

## State Management (Pinia)

Three domain-specific stores in `stores/`:

- **`workspaces.ts`** — workspace CRUD, current workspace tracking
- **`projects.ts`** — project CRUD with member assignment, permission-based filtering
- **`tasks.ts`** — multi-project task caching keyed by `projectId`, scope-aware filtering (`all` vs `assigneds`), optimistic updates with rollback, advanced filters (status, priority, due date, search)

All stores support a dual mode: Firebase for authenticated users, localStorage for guests.

## Permission System

Hierarchical role-based permissions defined in `constants/permissions.ts` and enforced server-side in `server/utils/permissions.ts`.

**Roles:** Owner > Admin > Member

**Workspace permissions:** manage-projects, create-projects, edit-projects, delete-projects, manage-members, add-members, remove-members, assign-project

**Project permissions:** manage-tasks, create-tasks, edit-tasks, delete-tasks, toggle-status

Permission implications simplify assignment (e.g., `manage-projects` implies `create-projects`, `edit-projects`, `delete-projects`). Project-level assignments can override workspace permissions. Task assignees can toggle task status without explicit edit permission.

## Server API Routes

All mutations go through `server/api/` routes which validate permissions before writing to Firestore. Client reads go directly to Firestore, secured by `firestore.rules`.

- **Auth:** `POST /api/auth/check-username`
- **Workspaces:** CRUD, admin toggling, ownership transfer
- **Projects:** CRUD, member assignment
- **Tasks:** CRUD
- **Members:** update permissions, remove
- **Invites:** send, accept, get details

## Composables

- **`useAuth.ts`** — singleton auth state, profile management, registration with rollback
- **`useWorkspace.ts`** — workspace context resolution (store > route)
- **`useMembers.ts`** — member management with project-specific filtering
- **`useProjectPermissions.ts`** — project-level permission resolution and caching
- **`useScrollReveal.ts`** — landing page scroll animations

## Components

Components are organized by domain:

- **`components/ui/`** — Shadcn-vue component library (buttons, cards, dialogs, forms, selects, sheets, dropdowns, etc.)
- **`components/home/`** — Landing page (Hero, Header, Footer, Features, Benefits, CTA, HowItWorks, Permissions, ProductMockup, SocialProof)
- **`components/tasks/`** — TaskForm, TaskList, TaskItem, TaskFilters, TaskInfos
- **`components/projects/`** — ProjectForm, ProjectList, ProjectItem, ProjectMembersPermissionsModal
- **`components/members/`** — MemberList, MemberItem, MemberPermissionsModal
- **`components/settings/`** — ProfileTab, PasswordTab, EmailTab
- **`components/workspaces/`** — WorkspaceForm, WorkspaceItem

## Type Definitions

- **`types/task.d.ts`** — Task interface (status: `pending` | `inProgress` | `completed`, priority: `urgent` | `important` | `normal`)
- **`types/projects.d.ts`** — Project interface with task counts and emoji
- **`types/Workspace.ts`** — Workspace interface
- **`types/assignments.d.ts`** — Project and task assignment interfaces with roles and permissions

## Firebase Cloud Functions

- **`syncUserProfileToMembers`** — Firestore trigger that syncs user profile changes (username, avatar, email) to all workspace member records automatically.

## Development

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm prettier         # Check formatting
pnpm prettier:fix     # Fix formatting
pnpm typecheck        # TypeScript type checking
pnpm deploy           # Full CI: prettier + lint + typecheck + build
```

Firebase Functions (from `functions/` directory):

```bash
npm run build         # Compile TypeScript
npm run serve         # Build + start Firebase emulators
npm run deploy        # Deploy functions to Firebase
```

## Code Style

- **Prettier:** single quotes, no semicolons, no trailing commas
- **ESLint:** `@typescript-eslint/no-explicit-any` disabled, `vue/html-self-closing` disabled
- Prettier rules enforced via ESLint integration
