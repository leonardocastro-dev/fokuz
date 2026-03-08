import { db } from '@/server/utils/firebase-admin'
import {
  verifyAuth,
  requireOwner,
  cleanupWorkspaceAssignments
} from '@/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)
  const workspaceId = getRouterParam(event, 'workspaceId')

  if (!workspaceId) {
    throw createError({ statusCode: 400, message: 'Workspace ID is required' })
  }

  await requireOwner(workspaceId, uid)

  // Clean up all projectAssignments and taskAssignments first
  await cleanupWorkspaceAssignments(workspaceId)

  const batch = db.batch()

  const membersSnap = await db
    .collection(`workspaces/${workspaceId}/members`)
    .get()
  membersSnap.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  const projectsSnap = await db
    .collection(`workspaces/${workspaceId}/projects`)
    .get()
  // Delete all tasks at workspace level
  const tasksSnap = await db.collection(`workspaces/${workspaceId}/tasks`).get()
  tasksSnap.docs.forEach((taskDoc) => {
    batch.delete(taskDoc.ref)
  })

  for (const projectDoc of projectsSnap.docs) {
    batch.delete(projectDoc.ref)
  }

  const workspaceRef = db.doc(`workspaces/${workspaceId}`)
  batch.delete(workspaceRef)

  await batch.commit()

  return { success: true }
})
