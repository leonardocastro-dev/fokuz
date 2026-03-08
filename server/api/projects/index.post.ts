import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  getMemberData,
  hasAnyPermission,
  updateProjectMembers,
  validateWorkspaceMemberIds
} from '@/server/utils/permissions'
import { PERMISSIONS } from '@/constants/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)

  const { workspaceId, title, description, emoji, memberIds } =
    await readBody(event)

  if (!workspaceId) {
    throw createError({ statusCode: 400, message: 'Workspace ID is required' })
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Project title is required' })
  }

  if (title.trim().length < 3) {
    throw createError({
      statusCode: 400,
      message: 'Title must be at least 3 characters'
    })
  }

  if (title.trim().length > 100) {
    throw createError({
      statusCode: 400,
      message: 'Title must be less than 100 characters'
    })
  }

  if (
    description &&
    typeof description === 'string' &&
    description.length > 500
  ) {
    throw createError({
      statusCode: 400,
      message: 'Description must be less than 500 characters'
    })
  }

  // Verify user is a workspace member
  const member = await getMemberData(workspaceId, uid)

  if (!member) {
    throw createError({
      statusCode: 403,
      message: 'You are not a member of this workspace'
    })
  }

  // Verify user has permission to create projects
  if (
    !hasAnyPermission(member.role, member.permissions, [
      PERMISSIONS.MANAGE_PROJECTS,
      PERMISSIONS.CREATE_PROJECTS
    ])
  ) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to create projects'
    })
  }

  const projectId = String(Date.now())

  const project = {
    id: projectId,
    title: title.trim(),
    description: description?.trim() || null,
    emoji: emoji || null,
    workspaceId,
    taskCount: 0,
    completedTaskCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const projectRef = db.doc(`workspaces/${workspaceId}/projects/${projectId}`)
  await projectRef.set(project)

  // Assign member access if provided (validate memberIds first)
  if (Array.isArray(memberIds) && memberIds.length > 0) {
    const { valid, invalid } = await validateWorkspaceMemberIds(
      workspaceId,
      memberIds
    )

    if (invalid.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Invalid member IDs: ${invalid.join(', ')}`
      })
    }

    if (valid.length > 0) {
      await updateProjectMembers(workspaceId, projectId, valid, uid)
    }
  }

  return { success: true, project }
})
