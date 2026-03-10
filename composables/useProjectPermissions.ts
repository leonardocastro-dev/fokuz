import { ref } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { WORKSPACE_PERMISSION_SET } from '@/constants/permissions'

export const useProjectPermissions = () => {
  const projectPermissionsMap = ref<Record<string, Record<string, boolean>>>({})
  const isLoading = ref(false)

  const loadProjectPermissions = async (
    workspaceId: string,
    projectIds: string[],
    userId: string
  ) => {
    isLoading.value = true

    try {
      const { $firestore } = useNuxtApp()
      const projectStore = useProjectStore()

      const workspacePerms = projectStore.memberPermissions || {}
      const filteredWorkspacePerms: Record<string, boolean> = {}
      for (const [key, val] of Object.entries(workspacePerms)) {
        if (WORKSPACE_PERMISSION_SET.has(key)) {
          filteredWorkspacePerms[key] = val
        }
      }

      const permPromises = projectIds.map(async (projectId) => {
        const assignmentRef = doc(
          $firestore,
          `workspaces/${workspaceId}/projects/${projectId}/members/${userId}`
        )
        const snap = await getDoc(assignmentRef)

        let projectPerms: Record<string, boolean> = {}
        if (snap.exists()) {
          const data = snap.data()
          if (data?.role === 'admin') {
            projectPerms = {
              'manage-tasks': true,
              'create-tasks': true,
              'edit-tasks': true,
              'delete-tasks': true,
              'toggle-status': true
            }
          } else {
            projectPerms = data?.permissions || {}
          }
        }

        projectPermissionsMap.value[projectId] = {
          ...filteredWorkspacePerms,
          ...projectPerms
        }
      })

      await Promise.all(permPromises)
    } finally {
      isLoading.value = false
    }
  }

  return {
    projectPermissionsMap,
    isLoading,
    loadProjectPermissions
  }
}
