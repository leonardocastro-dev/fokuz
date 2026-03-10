import { FieldValue } from 'firebase-admin/firestore'
import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  getMemberData,
  isOwner,
  isAdmin,
  hasAnyPermission,
  cleanupMemberAssignments,
  PERMISSIONS
} from '@/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)
  const memberId = getRouterParam(event, 'memberId')

  const { workspaceId } = await readBody(event)

  if (!workspaceId || !memberId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID and Member ID are required'
    })
  }

  const currentUser = await getMemberData(workspaceId, uid)

  if (!currentUser) {
    throw createError({
      statusCode: 403,
      message: 'You are not a member of this workspace'
    })
  }

  const targetMember = await getMemberData(workspaceId, memberId)

  if (!targetMember) {
    throw createError({ statusCode: 404, message: 'Member not found' })
  }

  if (isOwner(targetMember.role)) {
    throw createError({
      statusCode: 403,
      message: 'Cannot remove the workspace owner'
    })
  }

  if (isAdmin(targetMember.role) && !isOwner(currentUser.role)) {
    throw createError({
      statusCode: 403,
      message: 'Only the workspace owner can remove admins'
    })
  }

  if (memberId === uid) {
    throw createError({
      statusCode: 403,
      message: 'You cannot remove yourself'
    })
  }

  const canRemove =
    isOwner(currentUser.role) ||
    (isAdmin(currentUser.role) && memberId !== uid) ||
    hasAnyPermission(currentUser.role, currentUser.permissions, [
      PERMISSIONS.MANAGE_MEMBERS,
      PERMISSIONS.REMOVE_MEMBERS
    ])

  if (!canRemove) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to remove members'
    })
  }

  await cleanupMemberAssignments(workspaceId, memberId)

  const batch = db.batch()

  const memberRef = db.doc(`workspaces/${workspaceId}/members/${memberId}`)
  batch.delete(memberRef)

  const workspaceRef = db.doc(`workspaces/${workspaceId}`)
  batch.update(workspaceRef, {
    members: FieldValue.arrayRemove(memberId)
  })

  await batch.commit()

  return { success: true }
})
