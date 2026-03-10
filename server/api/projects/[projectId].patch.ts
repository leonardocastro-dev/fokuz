import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  getMemberData,
  hasAnyPermission,
  canAccessProject,
  updateProjectMembers,
  validateWorkspaceMemberIds
} from '@/server/utils/permissions'
import { PERMISSIONS } from '@/constants/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)
  const projectId = getRouterParam(event, 'projectId')

  const { workspaceId, title, description, emoji, memberIds } =
    await readBody(event)

  if (!workspaceId || !projectId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID and Project ID are required'
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

  const isMemberAssignmentOnly =
    memberIds !== undefined &&
    title === undefined &&
    description === undefined &&
    emoji === undefined

  if (isMemberAssignmentOnly) {
    if (
      !hasAnyPermission(member?.role, member?.permissions ?? null, [
        PERMISSIONS.EDIT_PROJECTS,
        PERMISSIONS.ASSIGN_PROJECT
      ])
    ) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to assign members to projects'
      })
    }
  } else {
    if (
      !hasAnyPermission(member?.role, member?.permissions ?? null, [
        PERMISSIONS.MANAGE_PROJECTS,
        PERMISSIONS.EDIT_PROJECTS
      ])
    ) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to edit projects'
      })
    }
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Project title is required'
      })
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
  }

  if (
    description !== undefined &&
    description &&
    typeof description === 'string' &&
    description.length > 500
  ) {
    throw createError({
      statusCode: 400,
      message: 'Description must be less than 500 characters'
    })
  }

  const projectRef = db.doc(`workspaces/${workspaceId}/projects/${projectId}`)
  const projectSnap = await projectRef.get()

  if (!projectSnap.exists) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString()
  }

  if (title !== undefined) updateData.title = title.trim()
  if (description !== undefined)
    updateData.description = description?.trim() || null
  if (emoji !== undefined) updateData.emoji = emoji || null

  await projectRef.update(updateData)

  if (memberIds !== undefined && Array.isArray(memberIds)) {
    if (memberIds.length > 0) {
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

      await updateProjectMembers(workspaceId, projectId, valid, uid)
    } else {
      await updateProjectMembers(workspaceId, projectId, [], uid)
    }
  }

  const updatedSnap = await projectRef.get()
  const project = { id: updatedSnap.id, ...updatedSnap.data() }

  return { success: true, project }
})
