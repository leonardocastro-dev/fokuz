import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  canAccessProject,
  requireProjectPermission,
  updateProjectTaskCounters,
  syncProjectAssignees
} from '@/server/utils/permissions'
import { PERMISSIONS } from '@/constants/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)

  const taskId = getRouterParam(event, 'taskId')

  if (!taskId) {
    throw createError({ statusCode: 400, message: 'Task ID is required' })
  }

  const { workspaceId } = await readBody(event)

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

  // Check if user has permission to delete tasks (project-scoped)
  await requireProjectPermission(workspaceId, taskProjectId, uid, [
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.DELETE_TASKS
  ])

  const hasAccess = await canAccessProject(workspaceId, taskProjectId, uid)
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'You do not have access to this project'
    })
  }

  // Delete the task
  await taskRef.delete()

  const taskStatus = taskDoc.data()?.status
  await updateProjectTaskCounters(
    workspaceId,
    taskProjectId,
    -1,
    taskStatus === 'completed' ? -1 : 0
  )

  await syncProjectAssignees(workspaceId, taskProjectId)

  return { success: true }
})
