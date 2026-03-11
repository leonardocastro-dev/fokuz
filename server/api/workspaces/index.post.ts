import { Timestamp } from 'firebase-admin/firestore'
import { db } from '@/server/utils/firebase-admin'
import { verifyAuth } from '@/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const { uid, email } = await verifyAuth(event)

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

  if (
    description &&
    typeof description === 'string' &&
    description.trim().length > 200
  ) {
    throw createError({
      statusCode: 400,
      message: 'Workspace description must not exceed 200 characters'
    })
  }

  let slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  if (!slug) {
    slug = 'workspace'
  }
  const workspaceId = `${slug}-${Date.now()}`

  const userSnap = await db.doc(`users/${uid}`).get()
  const userData = userSnap.data()

  const workspace = {
    id: workspaceId,
    slug,
    name: name.trim(),
    description: description?.trim() || null,
    ownerId: uid,
    members: [uid],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const batch = db.batch()

  const workspaceRef = db.doc(`workspaces/${workspaceId}`)
  batch.set(workspaceRef, workspace)

  const memberRef = db.doc(`workspaces/${workspaceId}/members/${uid}`)
  batch.set(memberRef, {
    uid,
    email: email || userData?.email || '',
    username:
      userData?.username || userData?.name || email?.split('@')[0] || '',
    avatarUrl: userData?.avatarUrl || null,
    role: 'owner',
    permissions: {},
    joinedAt: Timestamp.now()
  })

  await batch.commit()

  return { success: true, workspace }
})
