declare type ProjectRole = 'admin' | 'member'
declare type TaskRole = 'assignee'

declare interface ProjectAssignmentPermissions {
  'manage-tasks'?: boolean
  'create-tasks'?: boolean
  'edit-tasks'?: boolean
  'delete-tasks'?: boolean
  'toggle-status'?: boolean
  [key: string]: boolean | undefined
}

declare interface ProjectAssignment {
  role: ProjectRole
  assignedAt: string
  assignedBy?: string
  permissions?: ProjectAssignmentPermissions
}

declare interface TaskAssignment {
  role: TaskRole
  assignedAt: string
  assignedBy?: string
}
