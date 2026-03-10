import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Workspace } from '@/types/Workspace'
import { useAuth } from '@/composables/useAuth'
import { collection, query, where, getDocs } from 'firebase/firestore'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])
  const currentWorkspace = ref<Workspace | null>(null)
  const isLoading = ref(false)
  const loaded = ref(false)

  const { user } = useAuth()

  const getAuthToken = async (): Promise<string | null> => {
    if (!user.value) return null
    return await user.value.getIdToken()
  }

  const saveToLocalStorage = () => {
    localStorage.setItem('localWorkspaces', JSON.stringify(workspaces.value))
  }

  const loadWorkspaces = async (userId: string | null = null) => {
    isLoading.value = true
    try {
      if (!userId) {
        const localWorkspaces = localStorage.getItem('localWorkspaces')
        workspaces.value = localWorkspaces ? JSON.parse(localWorkspaces) : []
        loaded.value = true
        return
      }

      const { $firestore } = useNuxtApp()

      const workspacesRef = collection($firestore, 'workspaces')
      const q = query(workspacesRef, where('members', 'array-contains', userId))

      const snapshot = await getDocs(q)

      workspaces.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Workspace[]
      loaded.value = true
    } catch (error) {
      console.error('Error loading workspaces:', error)
    } finally {
      isLoading.value = false
    }
  }

  const createWorkspace = async (name: string, description?: string) => {
    if (!user.value?.uid) {
      let slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      if (!slug) {
        slug = 'workspace'
      }
      const workspaceId = `${slug}-${Date.now()}`
      const workspace: Workspace = {
        id: workspaceId,
        slug,
        name,
        description,
        ownerId: 'local',
        members: ['local'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      workspaces.value.push(workspace)
      saveToLocalStorage()
      return workspace
    }

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Not authenticated')

      const response = await $fetch<{ success: boolean; workspace: Workspace }>(
        '/api/workspaces',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: { name, description }
        }
      )

      if (response.success && response.workspace) {
        workspaces.value.push(response.workspace)
        return response.workspace
      }
      return null
    } catch (error) {
      console.error('Error creating workspace:', error)
      return null
    }
  }

  const updateWorkspace = async (
    workspaceId: string,
    name: string,
    description?: string
  ) => {
    const workspaceIndex = workspaces.value.findIndex(
      (ws) => ws.id === workspaceId
    )
    if (workspaceIndex === -1) return null

    if (!user.value?.uid) {
      const updatedWorkspace = {
        ...workspaces.value[workspaceIndex],
        name,
        description,
        updatedAt: new Date().toISOString()
      }
      workspaces.value[workspaceIndex] = updatedWorkspace
      saveToLocalStorage()
      return updatedWorkspace
    }

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Not authenticated')

      const response = await $fetch<{
        success: boolean
        workspace: Partial<Workspace>
      }>(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: { name, description }
      })

      if (response.success) {
        const updatedWorkspace = {
          ...workspaces.value[workspaceIndex],
          ...response.workspace
        }
        workspaces.value[workspaceIndex] = updatedWorkspace
        return updatedWorkspace
      }
      return null
    } catch (error) {
      console.error('Error updating workspace:', error)
      return null
    }
  }

  const setCurrentWorkspace = (workspace: Workspace | null) => {
    currentWorkspace.value = workspace
  }

  const getWorkspaceBySlug = (slug: string) => {
    return workspaces.value.find((ws) => ws.slug === slug) || null
  }

  const clearLocalData = () => {
    workspaces.value = []
    currentWorkspace.value = null
    loaded.value = false
    localStorage.removeItem('localWorkspaces')
  }

  const deleteWorkspace = async (
    workspaceId: string,
    userId: string | null = null
  ) => {
    if (!userId) {
      workspaces.value = workspaces.value.filter((ws) => ws.id !== workspaceId)
      saveToLocalStorage()
      return
    }

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Not authenticated')

      const response = await $fetch<{ success: boolean }>(
        `/api/workspaces/${workspaceId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.success) {
        workspaces.value = workspaces.value.filter(
          (ws) => ws.id !== workspaceId
        )
      }
    } catch (error) {
      console.error('Error deleting workspace:', error)
    }
  }

  return {
    workspaces,
    currentWorkspace,
    isLoading,
    loaded,

    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setCurrentWorkspace,
    getWorkspaceBySlug,
    clearLocalData
  }
})
