import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { auth, db } from '@/server/utils/firebase-admin'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const idToken = authHeader.replace('Bearer ', '')
  const decoded = await auth.verifyIdToken(idToken)

  const { token } = await readBody(event)

  if (!token) {
    throw createError({ statusCode: 400, message: 'Missing invite token' })
  }

  const inviteQuery = await db
    .collection('invites')
    .where('token', '==', token)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  if (inviteQuery.empty) {
    throw createError({ statusCode: 404, message: 'Invitation not found' })
  }

  const inviteDoc = inviteQuery.docs[0]
  const invite = inviteDoc.data()

  if (!invite.expiresAt || invite.expiresAt.toMillis() < Date.now()) {
    throw createError({ statusCode: 410, message: 'Invite expired' })
  }

  if (invite.invitedEmail !== decoded.email) {
    throw createError({
      statusCode: 403,
      message: 'This invitation was sent to a different email address'
    })
  }

  await db.runTransaction(async (tx) => {
    const inviteRef = db.collection('invites').doc(inviteDoc.id)
    const workspaceRef = db.collection('workspaces').doc(invite.workspaceId)
    const memberRef = db
      .collection('workspaces')
      .doc(invite.workspaceId)
      .collection('members')
      .doc(decoded.uid)

    const currentInvite = await tx.get(inviteRef)

    if (!currentInvite.exists || currentInvite.data()?.status !== 'pending') {
      throw createError({ statusCode: 400, message: 'Invite already used' })
    }

    const workspaceSnap = await tx.get(workspaceRef)

    if (!workspaceSnap.exists) {
      throw createError({ statusCode: 404, message: 'Workspace not found' })
    }

    const members = workspaceSnap.data()?.members ?? []

    if (members.includes(decoded.uid)) {
      throw createError({
        statusCode: 400,
        message: 'User already belongs to this workspace'
      })
    }

    const userRef = db.collection('users').doc(decoded.uid)
    const userSnap = await tx.get(userRef)
    const userData = userSnap.exists ? userSnap.data() : null

    tx.update(workspaceRef, {
      members: FieldValue.arrayUnion(decoded.uid)
    })

    tx.set(memberRef, {
      uid: decoded.uid,
      email: decoded.email || userData?.email || '',
      username:
        userData?.username ||
        userData?.name ||
        decoded.email?.split('@')[0] ||
        '',
      avatarUrl: userData?.avatarUrl || null,
      role: 'member',
      permissions: null,
      joinedAt: Timestamp.now()
    })

    tx.update(inviteRef, {
      status: 'accepted',
      acceptedBy: decoded.uid,
      acceptedAt: FieldValue.serverTimestamp()
    })
  })

  return {
    success: true,
    workspaceId: invite.workspaceId
  }
})
