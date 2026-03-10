import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  canAccessProject,
  updateTaskMembers,
  validateWorkspaceMemberIds,
  requireProjectPermission,
  canToggleTaskStatus,
  updateProjectTaskCounters
} from '@/server/utils/permissions'
import { PERMISSIONS } from '@/constants/permissions'

const VALID_TASK_STATUSES = ['pending', 'inProgress', 'completed'] as const

const isValidTaskStatus = (
  value: unknown
): value is (typeof VALID_TASK_STATUSES)[number] =>
  typeof value === 'string' &&
  VALID_TASK_STATUSES.includes(value as (typeof VALID_TASK_STATUSES)[number])

const isCompletedStatus = (status: unknown): boolean => status === 'completed'

const getCompletedDelta = (oldStatus: unknown, newStatus: unknown): number => {
  const wasCompleted = isCompletedStatus(oldStatus)
  const isNowCompleted = isCompletedStatus(newStatus)
  if (wasCompleted === isNowCompleted) return 0
  return isNowCompleted ? 1 : -1
}

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)

  const taskId = getRouterParam(event, 'taskId')

  if (!taskId) {
    throw createError({ statusCode: 400, message: 'Task ID is required' })
  }

  const {
    workspaceId,
    title,
    description,
    status,
    priority,
    dueDate,
    completed,
    memberIds
  } = await readBody(event)

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID is required'
    })
  }

  const taskRef = db.doc(`workspaces/${workspaceId}/tasks/${taskId}`)
  const taskDoc = await taskRef.get()

  if (!taskDoc.exists) {
    throw createError({ statusCode: 404, message: 'Task not found' })
  }

  const taskProjectId = taskDoc.data()?.projectId as string

  const isStatusOnlyUpdate =
    (status !== undefined || completed !== undefined) &&
    title === undefined &&
    description === undefined &&
    priority === undefined &&
    dueDate === undefined &&
    memberIds === undefined

  const hasAccess = await canAccessProject(workspaceId, taskProjectId, uid)
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'You do not have access to this project'
    })
  }

  if (isStatusOnlyUpdate) {
    const canToggle = await canToggleTaskStatus(workspaceId, taskProjectId, uid)
    if (!canToggle) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to perform this action'
      })
    }
  } else {
    await requireProjectPermission(workspaceId, taskProjectId, uid, [
      PERMISSIONS.MANAGE_TASKS,
      PERMISSIONS.EDIT_TASKS
    ])
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString()
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Task title cannot be empty'
      })
    }
    if (title.trim().length > 100) {
      throw createError({
        statusCode: 400,
        message: 'Task title must not exceed 100 characters'
      })
    }
    updates.title = title.trim()
  }

  if (description !== undefined) {
    updates.description = description?.trim() || null
  }

  if (status !== undefined) {
    if (!isValidTaskStatus(status)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid task status'
      })
    }
    updates.status = status
  }

  if (priority !== undefined) {
    updates.priority = priority
  }

  if (dueDate !== undefined) {
    updates.dueDate = dueDate
  }

  if (completed !== undefined) {
    updates.completed = completed
  }

  await taskRef.update(updates)

  if (status !== undefined) {
    const oldStatus = taskDoc.data()?.status
    if (oldStatus !== status) {
      const completedDelta = getCompletedDelta(oldStatus, status)
      if (completedDelta !== 0) {
        await updateProjectTaskCounters(
          workspaceId,
          taskProjectId,
          0,
          completedDelta
        )
      }
    }
  }

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

      await updateTaskMembers(workspaceId, taskProjectId, taskId, valid, uid)
    } else {
      await updateTaskMembers(workspaceId, taskProjectId, taskId, [], uid)
    }
  }

  return { success: true }
})
