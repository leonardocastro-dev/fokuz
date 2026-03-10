import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  getMemberData,
  hasAnyPermission,
  canAccessProject,
  deleteProjectAssignments
} from '@/server/utils/permissions'
import { PERMISSIONS } from '@/constants/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)
  const projectId = getRouterParam(event, 'projectId')

  const { workspaceId } = await readBody(event)

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

  if (
    !hasAnyPermission(member?.role, member?.permissions ?? null, [
      PERMISSIONS.MANAGE_PROJECTS,
      PERMISSIONS.DELETE_PROJECTS
    ])
  ) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to delete projects'
    })
  }

  const projectRef = db.doc(`workspaces/${workspaceId}/projects/${projectId}`)
  const projectSnap = await projectRef.get()

  if (!projectSnap.exists) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  const tasksSnap = await db
    .collection(`workspaces/${workspaceId}/tasks`)
    .where('projectId', '==', projectId)
    .get()

  const batch = db.batch()

  for (const taskDoc of tasksSnap.docs) {
    batch.delete(taskDoc.ref)
  }

  batch.delete(projectRef)

  await batch.commit()

  await deleteProjectAssignments(workspaceId, projectId)

  return { success: true }
})
