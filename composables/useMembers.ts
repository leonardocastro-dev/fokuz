import { ref, computed } from 'vue'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { ROLES, PERMISSIONS } from '@/constants/permissions'

export interface WorkspaceMember {
  uid: string
  email: string
  username: string
  avatarUrl: string | null
  role?: string
  permissions?: Record<string, boolean>
  joinedAt?: any
}

const isOwnerOrAdmin = (role: string | undefined): boolean => {
  return role === ROLES.OWNER || role === ROLES.ADMIN
}

const allMembers = ref<WorkspaceMember[]>([])
const selectedMemberIds = ref<string[]>([])

const membersForProjects = computed(() =>
  allMembers.value.filter((member) => !isOwnerOrAdmin(member.role))
)

const hasAccessProjectsPermission = (member: WorkspaceMember): boolean => {
  return member.permissions?.[PERMISSIONS.ACCESS_PROJECTS] === true
}
const projectAssignmentsMap = ref<Record<string, string[]>>({})
const projectAssignmentsDataMap = ref<
  Record<string, Record<string, ProjectAssignment>>
>({})
const isLoadingMembers = ref(false)
const error = ref<string | null>(null)
const loadedWorkspaceId = ref<string | null>(null)
const loadedProjectAssignmentsKey = ref<string | null>(null)

const buildProjectAssignmentsKey = (
  workspaceId: string,
  projectIds: string[]
) => `${workspaceId}:${[...projectIds].sort().join(',')}`

export const useMembers = () => {
  const loadWorkspaceMembers = async (
    workspaceId: string,
    forceReload = false
  ) => {
    if (!workspaceId) return

    if (
      !forceReload &&
      loadedWorkspaceId.value === workspaceId &&
      allMembers.value.length > 0
    ) {
      return
    }

    isLoadingMembers.value = true
    error.value = null

    try {
      const { $firestore } = useNuxtApp()
      const membersRef = collection(
        $firestore,
        'workspaces',
        workspaceId,
        'members'
      )
      const snapshot = await getDocs(membersRef)

      allMembers.value = snapshot.docs.map((doc) => ({
        uid: doc.id,
        email: doc.data().email,
        username: doc.data().username,
        avatarUrl: doc.data().avatarUrl || null,
        role: doc.data().role || 'member',
        permissions: doc.data().permissions || {},
        joinedAt: doc.data().joinedAt
      }))

      loadedWorkspaceId.value = workspaceId
    } catch (e) {
      error.value = 'Failed to load members'
      console.error('Error loading workspace members:', e)
    } finally {
      isLoadingMembers.value = false
    }
  }

  const loadProjectMembers = async (workspaceId: string, projectId: string) => {
    if (!workspaceId || !projectId) {
      selectedMemberIds.value = []
      return
    }

    isLoadingMembers.value = true

    try {
      const { $firestore } = useNuxtApp()
      const assignmentsRef = collection(
        $firestore,
        'workspaces',
        workspaceId,
        'projects',
        projectId,
        'members'
      )
      const snapshot = await getDocs(assignmentsRef)

      selectedMemberIds.value = snapshot.docs.map((doc) => doc.id)
    } catch (e) {
      console.error('Error loading project members:', e)
      selectedMemberIds.value = []
    } finally {
      isLoadingMembers.value = false
    }
  }

  const loadAllProjectAssignments = async (
    workspaceId: string,
    projectIds: string[],
    forceReload = false
  ) => {
    if (!workspaceId || projectIds.length === 0) {
      projectAssignmentsMap.value = {}
      projectAssignmentsDataMap.value = {}
      loadedProjectAssignmentsKey.value = null
      return
    }

    const cacheKey = buildProjectAssignmentsKey(workspaceId, projectIds)
    if (
      !forceReload &&
      loadedProjectAssignmentsKey.value === cacheKey &&
      Object.keys(projectAssignmentsMap.value).length > 0
    ) {
      return
    }

    try {
      const { $firestore } = useNuxtApp()
      const assignments: Record<string, string[]> = {}
      const assignmentsData: Record<
        string,
        Record<string, ProjectAssignment>
      > = {}

      await Promise.all(
        projectIds.map(async (projectId) => {
          const assignmentsRef = collection(
            $firestore,
            'workspaces',
            workspaceId,
            'projects',
            projectId,
            'members'
          )
          const snapshot = await getDocs(assignmentsRef)
          assignments[projectId] = snapshot.docs.map((doc) => doc.id)
          assignmentsData[projectId] = {}
          snapshot.docs.forEach((doc) => {
            assignmentsData[projectId][doc.id] = doc.data() as ProjectAssignment
          })
        })
      )

      projectAssignmentsMap.value = assignments
      projectAssignmentsDataMap.value = assignmentsData
      loadedProjectAssignmentsKey.value = cacheKey
    } catch (e) {
      console.error('Error loading project assignments:', e)
      projectAssignmentsMap.value = {}
      projectAssignmentsDataMap.value = {}
      loadedProjectAssignmentsKey.value = null
    }
  }

  const loadTaskAssignees = async (workspaceId: string, taskId: string) => {
    if (!workspaceId || !taskId) {
      selectedMemberIds.value = []
      return
    }

    isLoadingMembers.value = true

    try {
      const { $firestore } = useNuxtApp()
      const taskRef = doc(
        $firestore,
        'workspaces',
        workspaceId,
        'tasks',
        taskId
      )
      const taskSnap = await getDoc(taskRef)

      selectedMemberIds.value = taskSnap.exists()
        ? taskSnap.data()?.assigneeIds || []
        : []
    } catch (e) {
      console.error('Error loading task assignees:', e)
      selectedMemberIds.value = []
    } finally {
      isLoadingMembers.value = false
    }
  }

  const invalidateAssignmentsCache = () => {
    loadedProjectAssignmentsKey.value = null
  }

  const removeMemberLocally = (memberId: string) => {
    allMembers.value = allMembers.value.filter((m) => m.uid !== memberId)
  }

  return {
    members: allMembers,
    membersForProjects,
    selectedMemberIds,
    projectAssignmentsMap,
    projectAssignmentsDataMap,
    isLoadingMembers,
    error,
    loadWorkspaceMembers,
    loadProjectMembers,
    loadAllProjectAssignments,
    loadTaskAssignees,
    invalidateAssignmentsCache,
    removeMemberLocally,
    hasAccessProjectsPermission
  }
}
