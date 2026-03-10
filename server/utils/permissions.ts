import type { H3Event } from 'h3'
import { createError, getHeader } from 'h3'
import { FieldValue } from 'firebase-admin/firestore'
import { auth, db } from './firebase-admin'
import type { Role } from '@/constants/permissions'
import {
  ROLES,
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  PROJECT_PERMISSIONS,
  PROJECT_ROLES,
  impliesWorkspace,
  impliesProject,
  isOwner,
  isAdmin,
  isOwnerOrAdmin,
  isProjectAdmin,
  hasPermission,
  hasAnyPermission,
  hasWorkspacePermission,
  hasProjectPermission,
  WORKSPACE_PERMISSION_SET,
  PROJECT_PERMISSION_SET
} from '@/constants/permissions'

export {
  isOwner,
  isAdmin,
  isOwnerOrAdmin,
  isProjectAdmin,
  hasPermission,
  hasAnyPermission,
  hasWorkspacePermission,
  hasProjectPermission,
  ROLES,
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  PROJECT_PERMISSIONS,
  PROJECT_ROLES,
  impliesWorkspace,
  impliesProject,
  WORKSPACE_PERMISSION_SET,
  PROJECT_PERMISSION_SET
}

export interface MemberData {
  role: Role | string
  permissions: Record<string, boolean> | null
}

export interface AuthResult {
  uid: string
  email?: string
}

export async function verifyAuth(event: H3Event): Promise<AuthResult> {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const idToken = authHeader.replace('Bearer ', '')
  const decoded = await auth.verifyIdToken(idToken)

  return {
    uid: decoded.uid,
    email: decoded.email
  }
}

export async function getMemberData(
  workspaceId: string,
  userId: string
): Promise<MemberData | null> {
  const memberRef = db.doc(`workspaces/${workspaceId}/members/${userId}`)
  const memberSnap = await memberRef.get()

  if (!memberSnap.exists) {
    return null
  }

  const data = memberSnap.data()
  return {
    role: data?.role || ROLES.MEMBER,
    permissions: data?.permissions || {}
  }
}

export async function canAccessProject(
  workspaceId: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  const member = await getMemberData(workspaceId, userId)
  if (!member) return false
  if (isOwnerOrAdmin(member.role)) return true

  if (
    hasPermission(member.role, member.permissions, PERMISSIONS.ACCESS_PROJECTS)
  )
    return true

  const assignmentRef = db.doc(
    `workspaces/${workspaceId}/projects/${projectId}/members/${userId}`
  )
  const snap = await assignmentRef.get()
  return snap.exists
}

export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  const workspaceRef = db.doc(`workspaces/${workspaceId}`)
  const workspaceSnap = await workspaceRef.get()

  if (!workspaceSnap.exists) {
    throw createError({ statusCode: 404, message: 'Workspace not found' })
  }

  const members = workspaceSnap.data()?.members || []
  if (!members.includes(userId)) {
    throw createError({
      statusCode: 403,
      message: 'You are not a member of this workspace'
    })
  }
}

export async function requirePermission(
  workspaceId: string,
  userId: string,
  requiredPermissions: string[]
): Promise<MemberData> {
  await requireWorkspaceMember(workspaceId, userId)

  const member = await getMemberData(workspaceId, userId)

  if (
    !member ||
    !hasAnyPermission(member.role, member.permissions, requiredPermissions)
  ) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to perform this action'
    })
  }

  return member
}

export async function requireProjectPermission(
  workspaceId: string,
  projectId: string,
  userId: string,
  requiredPermissions: string[]
): Promise<MemberData> {
  await requireWorkspaceMember(workspaceId, userId)

  const member = await getMemberData(workspaceId, userId)

  if (!member) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to perform this action'
    })
  }

  if (isOwnerOrAdmin(member.role)) return member

  const assignmentRef = db.doc(
    `workspaces/${workspaceId}/projects/${projectId}/members/${userId}`
  )
  const snap = await assignmentRef.get()

  if (!snap.exists) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to perform this action'
    })
  }

  const assignmentData = snap.data()

  if (isProjectAdmin(assignmentData?.role)) return member

  const projectPerms = assignmentData?.permissions || {}

  for (const perm of requiredPermissions) {
    if (hasProjectPermission(null, projectPerms, perm)) return member
  }

  throw createError({
    statusCode: 403,
    message: 'You do not have permission to perform this action'
  })
}

export async function requireOwner(
  workspaceId: string,
  userId: string
): Promise<MemberData> {
  await requireWorkspaceMember(workspaceId, userId)

  const member = await getMemberData(workspaceId, userId)

  if (!member || !isOwner(member.role)) {
    throw createError({
      statusCode: 403,
      message: 'Only the workspace owner can perform this action'
    })
  }

  return member
}

export async function requireOwnerOrAdmin(
  workspaceId: string,
  userId: string
): Promise<MemberData> {
  await requireWorkspaceMember(workspaceId, userId)

  const member = await getMemberData(workspaceId, userId)

  if (!member || !isOwnerOrAdmin(member.role)) {
    throw createError({
      statusCode: 403,
      message: 'Only owners and admins can perform this action'
    })
  }

  return member
}

export async function updateProjectMembers(
  workspaceId: string,
  projectId: string,
  memberIds: string[],
  assignedBy?: string
): Promise<void> {
  const assignmentsRef = db.collection(
    `workspaces/${workspaceId}/projects/${projectId}/members`
  )
  const currentSnapshot = await assignmentsRef.get()
  const currentMemberIds = currentSnapshot.docs.map((doc) => doc.id)

  const batch = db.batch()

  for (const memberId of memberIds) {
    if (!currentMemberIds.includes(memberId)) {
      const assignmentRef = db.doc(
        `workspaces/${workspaceId}/projects/${projectId}/members/${memberId}`
      )
      const assignment: ProjectAssignment = {
        role: 'member',
        assignedAt: new Date().toISOString(),
        assignedBy
      }
      batch.set(assignmentRef, assignment)
    }
  }

  for (const doc of currentSnapshot.docs) {
    if (!memberIds.includes(doc.id)) {
      batch.delete(doc.ref)
    }
  }

  await batch.commit()
}

// Task Assignment Functions

export async function canToggleTaskStatus(
  workspaceId: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  const member = await getMemberData(workspaceId, userId)
  if (!member) return false

  if (isOwnerOrAdmin(member.role)) return true

  const assignmentRef = db.doc(
    `workspaces/${workspaceId}/projects/${projectId}/members/${userId}`
  )
  const assignmentSnap = await assignmentRef.get()

  if (!assignmentSnap.exists) return false

  const assignmentData = assignmentSnap.data()

  if (isProjectAdmin(assignmentData?.role)) return true

  const assignmentPermissions = assignmentData?.permissions || {}
  return assignmentPermissions[PERMISSIONS.TOGGLE_STATUS] === true
}

export async function deleteProjectAssignments(
  workspaceId: string,
  projectId: string
): Promise<void> {
  const assignmentsRef = db.collection(
    `workspaces/${workspaceId}/projects/${projectId}/members`
  )
  const snapshot = await assignmentsRef.get()

  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
}

export async function updateTaskMembers(
  workspaceId: string,
  projectId: string,
  taskId: string,
  memberIds: string[],
  assignedBy?: string
): Promise<void> {
  const taskRef = db.doc(`workspaces/${workspaceId}/tasks/${taskId}`)
  const taskSnap = await taskRef.get()
  const currentAssignments: Record<string, TaskAssignment> =
    taskSnap.data()?.assignments || {}

  const now = new Date().toISOString()

  const newAssignments: Record<string, TaskAssignment> = {}
  for (const memberId of memberIds) {
    if (currentAssignments[memberId]) {
      newAssignments[memberId] = currentAssignments[memberId]
    } else {
      newAssignments[memberId] = {
        role: 'assignee',
        assignedAt: now,
        assignedBy
      }
    }
  }

  await taskRef.update({
    assigneeIds: memberIds,
    assignments: newAssignments,
    updatedAt: now
  })

  await syncProjectAssignees(workspaceId, projectId)
}

export async function syncProjectAssignees(
  workspaceId: string,
  projectId: string
): Promise<void> {
  const tasksRef = db.collection(`workspaces/${workspaceId}/tasks`)
  const tasksQuery = tasksRef.where('projectId', '==', projectId)
  const tasksSnapshot = await tasksQuery.get()

  const assigneeSet = new Set<string>()
  tasksSnapshot.docs.forEach((doc) => {
    const assigneeIds = doc.data().assigneeIds || []
    assigneeIds.forEach((id: string) => assigneeSet.add(id))
  })

  const projectRef = db.doc(`workspaces/${workspaceId}/projects/${projectId}`)
  await projectRef.update({
    assigneeIds: Array.from(assigneeSet),
    updatedAt: new Date().toISOString()
  })
}

// Cleanup Functions

export async function cleanupWorkspaceAssignments(
  workspaceId: string
): Promise<void> {
  const batch = db.batch()

  const projectsRef = db.collection(`workspaces/${workspaceId}/projects`)
  const projectsSnap = await projectsRef.get()

  for (const projectDoc of projectsSnap.docs) {
    const membersSnap = await projectDoc.ref.collection('members').get()
    membersSnap.docs.forEach((memberDoc) => batch.delete(memberDoc.ref))
  }

  await batch.commit()
}

export async function cleanupMemberAssignments(
  workspaceId: string,
  memberId: string
): Promise<void> {
  const batch = db.batch()

  const projectsRef = db.collection(`workspaces/${workspaceId}/projects`)
  const projectsSnap = await projectsRef.get()

  for (const projectDoc of projectsSnap.docs) {
    const memberRef = projectDoc.ref.collection('members').doc(memberId)
    const memberSnap = await memberRef.get()
    if (memberSnap.exists) {
      batch.delete(memberRef)
    }
  }

  const tasksRef = db.collection(`workspaces/${workspaceId}/tasks`)
  const tasksSnap = await tasksRef
    .where('assigneeIds', 'array-contains', memberId)
    .get()

  const affectedProjectIds = new Set<string>()
  for (const taskDoc of tasksSnap.docs) {
    const projectId = taskDoc.data().projectId
    if (projectId) affectedProjectIds.add(projectId)
    batch.update(taskDoc.ref, {
      [`assignments.${memberId}`]: FieldValue.delete(),
      assigneeIds: FieldValue.arrayRemove(memberId),
      updatedAt: new Date().toISOString()
    })
  }

  await batch.commit()

  for (const projectId of affectedProjectIds) {
    await syncProjectAssignees(workspaceId, projectId)
  }
}

// Validation Functions

export async function validateWorkspaceMemberIds(
  workspaceId: string,
  memberIds: string[]
): Promise<{ valid: string[]; invalid: string[] }> {
  const valid: string[] = []
  const invalid: string[] = []

  for (const memberId of memberIds) {
    const memberRef = db.doc(`workspaces/${workspaceId}/members/${memberId}`)
    const memberSnap = await memberRef.get()

    if (memberSnap.exists) {
      valid.push(memberId)
    } else {
      invalid.push(memberId)
    }
  }

  return { valid, invalid }
}

// Project Task Counters

export async function updateProjectTaskCounters(
  workspaceId: string,
  projectId: string,
  taskCountDelta: number,
  completedCountDelta: number
): Promise<void> {
  const projectRef = db.doc(`workspaces/${workspaceId}/projects/${projectId}`)
  const projectSnap = await projectRef.get()
  if (!projectSnap.exists) return

  const data = projectSnap.data()

  if (data?.taskCount === undefined || data?.taskCount === null) {
    const tasksRef = db.collection(`workspaces/${workspaceId}/tasks`)
    const tasksSnap = await tasksRef.where('projectId', '==', projectId).get()

    let totalCount = 0
    let completedCount = 0
    tasksSnap.docs.forEach((doc) => {
      totalCount++
      if (doc.data().status === 'completed') completedCount++
    })

    await projectRef.update({
      taskCount: totalCount,
      completedTaskCount: completedCount
    })
    return
  }

  const updates: Record<string, unknown> = {}
  if (taskCountDelta !== 0) {
    updates.taskCount = FieldValue.increment(taskCountDelta)
  }
  if (completedCountDelta !== 0) {
    updates.completedTaskCount = FieldValue.increment(completedCountDelta)
  }
  if (Object.keys(updates).length > 0) {
    await projectRef.update(updates)
  }
}
