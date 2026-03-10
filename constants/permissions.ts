export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const PERMISSIONS = {
  ACCESS_PROJECTS: 'access-projects',
  MANAGE_PROJECTS: 'manage-projects',
  CREATE_PROJECTS: 'create-projects',
  EDIT_PROJECTS: 'edit-projects',
  DELETE_PROJECTS: 'delete-projects',
  MANAGE_TASKS: 'manage-tasks',
  CREATE_TASKS: 'create-tasks',
  EDIT_TASKS: 'edit-tasks',
  DELETE_TASKS: 'delete-tasks',
  TOGGLE_STATUS: 'toggle-status',
  MANAGE_MEMBERS: 'manage-members',
  ADD_MEMBERS: 'add-members',
  REMOVE_MEMBERS: 'remove-members',
  ASSIGN_PROJECT: 'assign-project'
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const WORKSPACE_PERMISSIONS = {
  ACCESS_PROJECTS: PERMISSIONS.ACCESS_PROJECTS,
  MANAGE_PROJECTS: PERMISSIONS.MANAGE_PROJECTS,
  CREATE_PROJECTS: PERMISSIONS.CREATE_PROJECTS,
  EDIT_PROJECTS: PERMISSIONS.EDIT_PROJECTS,
  DELETE_PROJECTS: PERMISSIONS.DELETE_PROJECTS,
  MANAGE_MEMBERS: PERMISSIONS.MANAGE_MEMBERS,
  ADD_MEMBERS: PERMISSIONS.ADD_MEMBERS,
  REMOVE_MEMBERS: PERMISSIONS.REMOVE_MEMBERS,
  ASSIGN_PROJECT: PERMISSIONS.ASSIGN_PROJECT
} as const

export const PROJECT_PERMISSIONS = {
  MANAGE_TASKS: PERMISSIONS.MANAGE_TASKS,
  CREATE_TASKS: PERMISSIONS.CREATE_TASKS,
  EDIT_TASKS: PERMISSIONS.EDIT_TASKS,
  DELETE_TASKS: PERMISSIONS.DELETE_TASKS,
  TOGGLE_STATUS: PERMISSIONS.TOGGLE_STATUS
} as const

export type WorkspacePermission =
  (typeof WORKSPACE_PERMISSIONS)[keyof typeof WORKSPACE_PERMISSIONS]
export type ProjectPermission =
  (typeof PROJECT_PERMISSIONS)[keyof typeof PROJECT_PERMISSIONS]

export const PROJECT_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member'
} as const

export type ProjectRoleType = (typeof PROJECT_ROLES)[keyof typeof PROJECT_ROLES]

export const isProjectAdmin = (
  projectRole: string | null | undefined
): boolean => {
  return projectRole === PROJECT_ROLES.ADMIN
}

export const impliesWorkspace: Record<string, string[]> = {
  [PERMISSIONS.MANAGE_PROJECTS]: [
    PERMISSIONS.CREATE_PROJECTS,
    PERMISSIONS.EDIT_PROJECTS,
    PERMISSIONS.DELETE_PROJECTS
  ],
  [PERMISSIONS.MANAGE_MEMBERS]: [
    PERMISSIONS.ADD_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.ASSIGN_PROJECT
  ]
}

export const impliesProject: Record<string, string[]> = {
  [PERMISSIONS.MANAGE_TASKS]: [
    PERMISSIONS.CREATE_TASKS,
    PERMISSIONS.EDIT_TASKS,
    PERMISSIONS.DELETE_TASKS,
    PERMISSIONS.TOGGLE_STATUS
  ]
}

export const WORKSPACE_PERMISSION_SET = new Set<string>(
  Object.values(WORKSPACE_PERMISSIONS)
)
export const PROJECT_PERMISSION_SET = new Set<string>(
  Object.values(PROJECT_PERMISSIONS)
)

const isWorkspaceScopedPermission = (permission: string): boolean => {
  return WORKSPACE_PERMISSION_SET.has(permission)
}

const isProjectScopedPermission = (permission: string): boolean => {
  return PROJECT_PERMISSION_SET.has(permission)
}

export const isOwner = (role: Role | string | null | undefined): boolean => {
  return role === ROLES.OWNER
}

export const isAdmin = (role: Role | string | null | undefined): boolean => {
  return role === ROLES.ADMIN
}

export const isOwnerOrAdmin = (
  role: Role | string | null | undefined
): boolean => {
  return isOwner(role) || isAdmin(role)
}

export const hasPermission = (
  role: Role | string | null | undefined,
  permissions: Record<string, boolean> | null,
  permission: string,
  projectRole?: string | null
): boolean => {
  if (isWorkspaceScopedPermission(permission)) {
    return hasWorkspacePermission(role, permissions, permission)
  }
  if (isProjectScopedPermission(permission)) {
    return hasProjectPermission(role, permissions, permission, projectRole)
  }
  if (isOwnerOrAdmin(role)) return true
  if (!permissions) return false
  if (permissions[permission] === true) return true
  return false
}

export const hasAnyPermission = (
  role: Role | string | null | undefined,
  permissions: Record<string, boolean> | null,
  permissionList: string[],
  projectRole?: string | null
): boolean => {
  if (isOwnerOrAdmin(role)) return true
  return permissionList.some((p) =>
    hasPermission(role, permissions, p, projectRole)
  )
}

// Scope-aware permission checks
export const hasWorkspacePermission = (
  role: Role | string | null | undefined,
  workspacePermissions: Record<string, boolean> | null,
  permission: string
): boolean => {
  if (isOwnerOrAdmin(role)) return true
  if (!workspacePermissions) return false
  if (workspacePermissions[permission] === true) return true
  for (const [parent, children] of Object.entries(impliesWorkspace)) {
    if (workspacePermissions[parent] === true && children.includes(permission))
      return true
  }
  return false
}

export const hasProjectPermission = (
  role: Role | string | null | undefined,
  projectPermissions: Record<string, boolean> | null,
  permission: string,
  projectRole?: string | null
): boolean => {
  if (isOwnerOrAdmin(role)) return true
  if (isProjectAdmin(projectRole)) return true
  if (!projectPermissions) return false
  if (projectPermissions[permission] === true) return true
  for (const [parent, children] of Object.entries(impliesProject)) {
    if (projectPermissions[parent] === true && children.includes(permission))
      return true
  }
  return false
}
