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

  if (newRole !== undefined && newRole !== 'admin' && newRole !== 'member') {
    throw createError({
      statusCode: 400,
      message: 'Invalid role. Must be "admin" or "member"'
    })
  }

  const hasAccess = await canAccessProject(workspaceId, projectId, uid)

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'You do not have access to this project'
    })
  }

  const member = await getMemberData(workspaceId, uid)
  const callerIsWsOwnerOrAdmin = isOwnerOrAdmin(member?.role)

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

  if (newRole === 'admin' && !callerIsWsOwnerOrAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Only workspace owners and admins can assign project admin role'
    })
  }

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

  if (memberId === uid) {
    throw createError({
      statusCode: 403,
      message: 'You cannot assign yourself to a project'
    })
  }

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

  const memberRef = db.doc(`workspaces/${workspaceId}/members/${memberId}`)
  const memberSnap = await memberRef.get()

  if (!memberSnap.exists) {
    throw createError({
      statusCode: 404,
      message: 'Member not found in workspace'
    })
  }

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
