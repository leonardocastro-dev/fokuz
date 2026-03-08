import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  getMemberData,
  hasAnyPermission,
  canAccessProject,
  isOwnerOrAdmin,
  isProjectAdmin
} from '@/server/utils/permissions'
import { PERMISSIONS, PROJECT_PERMISSION_SET } from '@/constants/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)
  const projectId = getRouterParam(event, 'projectId')
  const memberId = getRouterParam(event, 'memberId')

  const {
    workspaceId,
    permissions: taskPermissions,
    role: newRole
  } = await readBody(event)

  if (!workspaceId || !projectId || !memberId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID, Project ID, and Member ID are required'
    })
  }

  // Validate role if provided
  if (newRole !== undefined && newRole !== 'admin' && newRole !== 'member') {
    throw createError({
      statusCode: 400,
      message: 'Invalid role. Must be "admin" or "member"'
    })
  }

  // Check access via isOwnerOrAdmin, access-projects permission, OR projectAssignment
  const hasAccess = await canAccessProject(workspaceId, projectId, uid)

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'You do not have access to this project'
    })
  }

  // Verify caller permissions
  const member = await getMemberData(workspaceId, uid)
  const callerIsWsOwnerOrAdmin = isOwnerOrAdmin(member?.role)

  // Check if caller is project admin
  let callerIsProjectAdmin = false
  if (!callerIsWsOwnerOrAdmin) {
    const callerAssignmentRef = db.doc(
      `workspaces/${workspaceId}/projects/${projectId}/members/${uid}`
    )
    const callerAssignmentSnap = await callerAssignmentRef.get()
    callerIsProjectAdmin =
      callerAssignmentSnap.exists &&
      isProjectAdmin(callerAssignmentSnap.data()?.role)
  }

  // Only workspace owner/admin can set role to 'admin'
  if (newRole === 'admin' && !callerIsWsOwnerOrAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Only workspace owners and admins can assign project admin role'
    })
  }

  // Workspace owner/admin or project admin can manage assignments
  if (!callerIsWsOwnerOrAdmin && !callerIsProjectAdmin) {
    if (
      !hasAnyPermission(member?.role, member?.permissions ?? null, [
        PERMISSIONS.ASSIGN_PROJECT
      ])
    ) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to manage project assignments'
      })
    }
  }

  // Prevent self-assignment to avoid privilege escalation
  if (memberId === uid) {
    throw createError({
      statusCode: 403,
      message: 'You cannot assign yourself to a project'
    })
  }

  // Validate task permissions against allowed project-scoped keys
  if (taskPermissions && typeof taskPermissions === 'object') {
    const invalidKeys = Object.keys(taskPermissions).filter(
      (key) => !PROJECT_PERMISSION_SET.has(key)
    )
    if (invalidKeys.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Invalid permission keys: ${invalidKeys.join(', ')}`
      })
    }
  }

  // Verify the target member exists in workspace
  const memberRef = db.doc(`workspaces/${workspaceId}/members/${memberId}`)
  const memberSnap = await memberRef.get()

  if (!memberSnap.exists) {
    throw createError({
      statusCode: 404,
      message: 'Member not found in workspace'
    })
  }

  // Get or create the assignment
  const assignmentRef = db.doc(
    `workspaces/${workspaceId}/projects/${projectId}/members/${memberId}`
  )
  const assignmentSnap = await assignmentRef.get()

  if (assignmentSnap.exists) {
    const updateData: Record<string, unknown> = {}
    if (taskPermissions !== undefined) {
      updateData.permissions = taskPermissions || null
    }
    if (newRole !== undefined) {
      updateData.role = newRole
      // Admin does not need granular permissions
      if (newRole === 'admin') {
        updateData.permissions = null
      }
    }
    await assignmentRef.update(updateData)
  } else {
    const assignment: ProjectAssignment = {
      role: newRole || 'member',
      assignedAt: new Date().toISOString(),
      assignedBy: uid,
      permissions:
        newRole === 'admin' ? undefined : taskPermissions || undefined
    }
    await assignmentRef.set(assignment)
  }

  const updatedSnap = await assignmentRef.get()

  return {
    success: true,
    assignment: {
      memberId,
      projectId,
      ...updatedSnap.data()
    }
  }
})
