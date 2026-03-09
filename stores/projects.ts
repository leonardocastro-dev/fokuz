import { defineStore } from 'pinia'
import { collection, doc, getDocs, getDoc } from 'firebase/firestore'
import { useAuth } from '@/composables/useAuth'
import { showSuccessToast, showErrorToast } from '@/utils/toast'
import {
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
  isOwnerOrAdmin
} from '@/constants/permissions'

export const useProjectStore = defineStore('projects', {
  state: () => ({
    projects: [] as Project[],
    isLoading: false,
    error: null as string | null,
    memberRole: null as string | null,
    memberPermissions: null as Record<string, boolean> | null,
    isGuestMode: false,
    loadedWorkspaceId: null as string | null,
    assignedProjectIds: null as string[] | null
  }),

  getters: {
    totalProjects: (state) => state.projects.length,
    hasFullProjectAccess: (state) => {
      if (state.isGuestMode) return true
      if (isOwnerOrAdmin(state.memberRole)) return true
      return hasPermission(
        state.memberRole,
        state.memberPermissions,
        PERMISSIONS.ACCESS_PROJECTS
      )
    },
    visibleProjects(): Project[] {
      if (this.hasFullProjectAccess) return this.projects
      if (!this.assignedProjectIds) return []
      return this.projects.filter((p) =>
        this.assignedProjectIds!.includes(p.id)
      )
    },
    sortedProjects(): Project[] {
      return [...this.visibleProjects].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    },
    canCreateProjects: (state) => {
      if (state.isGuestMode) return true
      return hasAnyPermission(state.memberRole, state.memberPermissions, [
        PERMISSIONS.MANAGE_PROJECTS,
        PERMISSIONS.CREATE_PROJECTS
      ])
    },
    canDeleteProjects: (state) => {
      if (state.isGuestMode) return true
      return hasAnyPermission(state.memberRole, state.memberPermissions, [
        PERMISSIONS.MANAGE_PROJECTS,
        PERMISSIONS.DELETE_PROJECTS
      ])
    },
    canEditProjects: (state) => {
      if (state.isGuestMode) return true
      return hasAnyPermission(state.memberRole, state.memberPermissions, [
        PERMISSIONS.MANAGE_PROJECTS,
        PERMISSIONS.EDIT_PROJECTS
      ])
    },
    canAssignProjectMembers: (state) => {
      if (state.isGuestMode) return false
      return hasAnyPermission(state.memberRole, state.memberPermissions, [
        PERMISSIONS.ASSIGN_PROJECT
      ])
    }
  },

  actions: {
    async getAuthToken(): Promise<string | null> {
      const { user } = useAuth()
      if (!user.value) return null
      return await user.value.getIdToken()
    },

    async loadProjects(userId: string | null = null) {
      if (!userId) {
        this.isGuestMode = true
        const localProjects = localStorage.getItem('localProjects')
        this.projects = localProjects ? JSON.parse(localProjects) : []
        return
      }

      this.isGuestMode = false
      this.projects = []
    },

    async loadProjectsForWorkspace(
      workspaceId: string,
      userId: string | null = null,
      forceReload: boolean = false
    ) {
      if (!forceReload && this.loadedWorkspaceId === workspaceId) {
        return
      }

      try {
        this.isLoading = true
        this.error = null

        if (!userId) {
          this.isGuestMode = true
          const localProjects = localStorage.getItem('localProjects')
          const allProjects: Project[] = localProjects
            ? JSON.parse(localProjects)
            : []
          this.projects = allProjects.filter(
            (p) => p.workspaceId === workspaceId
          )
          this.loadedWorkspaceId = workspaceId
          return
        }

        this.isGuestMode = false

        const { $firestore } = useNuxtApp()

        const memberRef = doc(
          $firestore,
          'workspaces',
          workspaceId,
          'members',
          userId
        )
        const memberSnap = await getDoc(memberRef)

        if (memberSnap.exists()) {
          this.memberRole = memberSnap.data().role || 'member'
          this.memberPermissions = memberSnap.data().permissions || null
        } else {
          this.memberRole = null
          this.memberPermissions = null
        }

        if (workspaceId) {
          const projectsRef = collection(
            $firestore,
            'workspaces',
            workspaceId,
            'projects'
          )
          const snapshot = await getDocs(projectsRef)

          if (!snapshot.empty) {
            this.projects = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as Project[]

            if (!this.hasFullProjectAccess) {
              const assignedIds: string[] = []
              await Promise.all(
                this.projects.map(async (project) => {
                  const memberRef = doc(
                    $firestore,
                    'workspaces',
                    workspaceId,
                    'projects',
                    project.id,
                    'members',
                    userId
                  )
                  const snap = await getDoc(memberRef)
                  if (snap.exists()) {
                    assignedIds.push(project.id)
                  }
                })
              )
              this.assignedProjectIds = assignedIds
            } else {
              this.assignedProjectIds = null
            }
          } else {
            this.projects = []
            this.assignedProjectIds = null
          }
        } else {
          this.projects = []
          this.assignedProjectIds = null
        }

        this.loadedWorkspaceId = workspaceId
      } catch (error) {
        console.error('Error loading workspace projects:', error)
        this.error = 'Failed to load projects'
        showErrorToast('Failed to load workspace projects')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async reloadProjects(workspaceId: string, userId: string | null = null) {
      const taskStore = useTaskStore()
      taskStore.clearCache()

      await this.loadProjectsForWorkspace(workspaceId, userId, true)
    },

    clearCache() {
      this.loadedWorkspaceId = null
    },

    saveLocalProjects() {
      const allLocal: Project[] = JSON.parse(
        localStorage.getItem('localProjects') || '[]'
      )
      const currentWorkspaceId = this.loadedWorkspaceId
      const otherWorkspaceProjects = allLocal.filter(
        (p) => p.workspaceId !== currentWorkspaceId
      )
      localStorage.setItem(
        'localProjects',
        JSON.stringify([...otherWorkspaceProjects, ...this.projects])
      )
    },

    async addProject(
      project: Project,
      userId: string | null = null,
      workspaceId?: string,
      memberIds?: string[]
    ) {
      const projectWithTimestamp = {
        ...project,
        workspaceId: workspaceId || undefined
      }

      this.projects.push(projectWithTimestamp)

      if (!userId || !workspaceId) {
        this.saveLocalProjects()
        showSuccessToast('Project added successfully')
        return
      }

      try {
        const token = await this.getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ success: boolean; project: Project }>(
          '/api/projects',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
              workspaceId,
              title: project.title,
              description: project.description,
              emoji: project.emoji,
              memberIds
            }
          }
        )

        if (response.success && response.project) {
          const index = this.projects.findIndex((p) => p.id === project.id)
          if (index !== -1) {
            this.projects[index] = { ...response.project, workspaceId }
          }
        }

        showSuccessToast('Project added successfully')
      } catch (error) {
        this.projects = this.projects.filter((p) => p.id !== project.id)
        console.error('Error adding project:', error)
        showErrorToast('Failed to add project')
        throw error
      }
    },

    async updateProject(
      id: string,
      updatedProject: Partial<Project>,
      userId: string | null = null,
      memberIds?: string[]
    ) {
      const index = this.projects.findIndex((project) => project.id === id)
      if (index === -1) return

      const backup = { ...this.projects[index] }

      this.projects[index] = {
        ...this.projects[index],
        ...updatedProject,
        updatedAt: new Date().toISOString()
      }

      if (!userId) {
        this.saveLocalProjects()
        return
      }

      try {
        const project = this.projects[index]
        if (!project.workspaceId) return

        const token = await this.getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{
          success: boolean
          project: Partial<Project>
        }>(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            workspaceId: project.workspaceId,
            ...updatedProject,
            memberIds
          }
        })

        if (response.success) {
          this.projects[index] = {
            ...this.projects[index],
            ...response.project
          }
        }
      } catch (error) {
        this.projects[index] = backup
        console.error('Error updating project:', error)
        showErrorToast('Failed to update project')
        throw error
      }
    },

    async deleteProject(id: string, userId: string | null = null) {
      const projectToDelete = this.projects.find((project) => project.id === id)
      if (!projectToDelete) return

      const backup = [...this.projects]

      this.projects = this.projects.filter((project) => project.id !== id)

      if (!userId || !projectToDelete.workspaceId) {
        this.saveLocalProjects()
        localStorage.removeItem(`localTasks_${id}`)
        showSuccessToast('Project deleted successfully')
        return
      }

      try {
        const token = await this.getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ success: boolean }>(
          `/api/projects/${id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            body: { workspaceId: projectToDelete.workspaceId }
          }
        )

        if (response.success) {
          showSuccessToast('Project deleted successfully')
        }
      } catch (error) {
        this.projects = backup
        console.error('Error deleting project:', error)
        showErrorToast('Failed to delete project')
        throw error
      }
    },

    async inviteMember(
      projectId: string,
      memberEmail: string,
      userId: string | null = null
    ) {
      const project = this.projects.find((p) => p.id === projectId)
      if (!project) return

      if (!project.members) {
        project.members = []
      }

      if (project.members.includes(memberEmail)) {
        showErrorToast('Member already in project')
        return
      }

      project.members.push(memberEmail)
      await this.updateProject(projectId, { members: project.members }, userId)

      showSuccessToast(`Invited ${memberEmail} to project`)
    }
  }
})
