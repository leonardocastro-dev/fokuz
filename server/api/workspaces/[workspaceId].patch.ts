import { db } from '@/server/utils/firebase-admin'
import { verifyAuth, requireOwner } from '@/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const { uid } = await verifyAuth(event)
  const workspaceId = getRouterParam(event, 'workspaceId')

  if (!workspaceId) {
    throw createError({ statusCode: 400, message: 'Workspace ID is required' })
  }

  await requireOwner(workspaceId, uid)

  const { name, description } = await readBody(event)

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Workspace name is required'
    })
  }

  if (name.trim().length < 3) {
    throw createError({
      statusCode: 400,
      message: 'Workspace name must be at least 3 characters'
    })
  }

  if (name.trim().length > 50) {
    throw createError({
      statusCode: 400,
      message: 'Workspace name must not exceed 50 characters'
    })
  }

  if (description && typeof description === 'string' && description.trim().length > 200) {
    throw createError({
      statusCode: 400,
      message: 'Workspace description must not exceed 200 characters'
    })
  }

  const workspaceRef = db.doc(`workspaces/${workspaceId}`)

  await workspaceRef.update({
    name: name.trim(),
    description: description?.trim() || null,
    updatedAt: new Date().toISOString()
  })

  const updatedSnap = await workspaceRef.get()
  const workspace = { id: updatedSnap.id, ...updatedSnap.data() }

  return { success: true, workspace }
})
