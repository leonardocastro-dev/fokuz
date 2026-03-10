import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  canAccessProject,
  updateTaskMembers,
  validateWorkspaceMemberIds,
  requireProjectPermission,
  updateProjectTaskCounters
} from '@/server/utils/permissions'
import { PERMISSIONS } from '@/constants/permissions'

const VALID_TASK_STATUSES = ['pending', 'inProgress', 'completed'] as const

const isValidTaskStatus = (
  value: unknown
): value is (typeof VALID_TASK_STATUSES)[number] =>
  typeof value === 'string' &&
  VALID_TASK_STATUSES.includes(value as (typeof VALID_TASK_STATUSES)[number])

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)

  const {
    workspaceId,
    projectId,
    title,
    description,
    status,
    priority,
    dueDate,
    memberIds
  } = await readBody(event)

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID is required'
    })
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Task title is required' })
  }

  if (title.trim().length > 100) {
    throw createError({
      statusCode: 400,
      message: 'Task title must not exceed 100 characters'
    })
  }

  if (typeof projectId !== 'string' || projectId.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required'
    })
  }
  const normalizedProjectId = projectId.trim()

  await requireProjectPermission(workspaceId, normalizedProjectId, uid, [
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.CREATE_TASKS
  ])

  const projectRef = db.doc(
    `workspaces/${workspaceId}/projects/${normalizedProjectId}`
  )
  const projectSnap = await projectRef.get()
  if (!projectSnap.exists) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  const hasAccess = await canAccessProject(
    workspaceId,
    normalizedProjectId,
    uid
  )

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'You do not have access to this project'
    })
  }

  const taskId = String(Date.now())
  const normalizedStatus = status ?? 'pending'

  if (!isValidTaskStatus(normalizedStatus)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid task status'
    })
  }

  const task = {
    id: taskId,
    title: title.trim(),
    description: description?.trim() || null,
    status: normalizedStatus,
    priority: priority || 'normal',
    dueDate: dueDate || null,
    projectId: normalizedProjectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assigneeIds: memberIds || [],
    assignments: {}
  }

  const taskRef = db.doc(`workspaces/${workspaceId}/tasks/${taskId}`)
  await taskRef.set(task)

  await updateProjectTaskCounters(
    workspaceId,
    normalizedProjectId,
    1,
    task.status === 'completed' ? 1 : 0
  )

  if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
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
      await updateTaskMembers(
        workspaceId,
        normalizedProjectId,
        taskId,
        valid,
        uid
      )
    }
  }

  return { success: true, task }
})
