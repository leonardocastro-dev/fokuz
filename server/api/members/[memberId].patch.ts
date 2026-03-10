import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  getMemberData,
  isOwner,
  isAdmin,
  isOwnerOrAdmin,
  PROJECT_PERMISSION_SET
} from '@/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)
  const memberId = getRouterParam(event, 'memberId')

  const { workspaceId, permissions } = await readBody(event)

  if (!workspaceId || !memberId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID and Member ID are required'
    })
  }

  if (permissions === undefined) {
    throw createError({ statusCode: 400, message: 'Permissions are required' })
  }

  if (
    typeof permissions !== 'object' ||
    permissions === null ||
    Array.isArray(permissions)
  ) {
    throw createError({
      statusCode: 400,
      message: 'Permissions must be an object'
    })
  }

  if ('owner' in permissions || 'admin' in permissions) {
    throw createError({
      statusCode: 400,
      message: 'Use dedicated endpoints to manage owner/admin roles'
    })
  }

  const currentUser = await getMemberData(workspaceId, uid)

  if (!currentUser) {
    throw createError({
      statusCode: 403,
      message: 'You are not a member of this workspace'
    })
  }

  if (!isOwnerOrAdmin(currentUser.role)) {
    throw createError({
      statusCode: 403,
      message: 'Only owners and admins can update permissions'
    })
  }

  const targetMember = await getMemberData(workspaceId, memberId)

  if (!targetMember) {
    throw createError({ statusCode: 404, message: 'Member not found' })
  }

  if (isOwner(targetMember.role)) {
    throw createError({
      statusCode: 403,
      message: 'Cannot modify owner permissions'
    })
  }

  if (isAdmin(currentUser.role) && !isOwner(currentUser.role)) {
    if (memberId === uid) {
      throw createError({
        statusCode: 403,
        message: 'Admins cannot modify their own permissions'
      })
    }
    if (isAdmin(targetMember.role)) {
      throw createError({
        statusCode: 403,
        message: 'Only the workspace owner can modify admin permissions'
      })
    }
  }

  const invalidProjectPerms = Object.keys(permissions).filter((key) =>
    PROJECT_PERMISSION_SET.has(key)
  )
  if (invalidProjectPerms.length > 0) {
    throw createError({
      statusCode: 400,
      message: `Task permissions (${invalidProjectPerms.join(', ')}) must be set at project level`
    })
  }

  const memberRef = db.doc(`workspaces/${workspaceId}/members/${memberId}`)

  await memberRef.update({
    permissions: permissions as Record<string, boolean>
  })

  return { success: true }
})
