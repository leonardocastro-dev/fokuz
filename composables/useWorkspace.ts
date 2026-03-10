import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspaces'

export const useWorkspace = () => {
  const route = useRoute()
  const workspaceStore = useWorkspaceStore()

  const workspaceId = computed(() => {
    if (workspaceStore.currentWorkspace?.id) {
      return workspaceStore.currentWorkspace.id
    }
    const param = route.params.workspace
    return typeof param === 'string' ? param : param?.[0] || null
  })

  const workspace = computed(() => workspaceStore.currentWorkspace)

  return { workspaceId, workspace }
}
