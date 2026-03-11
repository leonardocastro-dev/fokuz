import { defineStore } from 'pinia'
import { showErrorToast } from '@/utils/toast'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore'
import { useProjectStore } from './projects'
import { useAuth } from '@/composables/useAuth'
import {
  PERMISSIONS,
  hasAnyPermission,
  WORKSPACE_PERMISSION_SET
} from '@/constants/permissions'

type TaskFilterState = {
  searchQuery: string
  statusFilter: string
  priorityFilter: string
  dueDateFilter: string
  customDueDate: string | null
  scopeFilter: string
  scopeUserId: string | null
}

const getTaskBucketKey = (projectId: string): string => projectId

const isCompletedStatus = (status: Status): boolean => status === 'completed'

const getCompletedDelta = (oldStatus: Status, newStatus: Status): number => {
  const wasCompleted = isCompletedStatus(oldStatus)
  const isNowCompleted = isCompletedStatus(newStatus)
  if (wasCompleted === isNowCompleted) return 0
  return isNowCompleted ? 1 : -1
}

const isTaskMatchingFilters = (
  task: Task,
  filters: TaskFilterState,
  skipStatus = false
): boolean => {
  if (filters.scopeFilter === 'assigneds' && filters.scopeUserId) {
    if (!task.assigneeIds?.includes(filters.scopeUserId)) return false
  }

  if (
    !skipStatus &&
    filters.statusFilter !== 'all' &&
    task.status !== filters.statusFilter
  ) {
    return false
  }

  if (
    filters.priorityFilter !== 'all' &&
    task.priority !== filters.priorityFilter
  ) {
    return false
  }

  if (filters.dueDateFilter !== 'all') {
    if (filters.dueDateFilter === 'no-date') {
      if (task.dueDate) return false
    } else {
      if (!task.dueDate) return false
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const due = new Date(task.dueDate)
      due.setHours(0, 0, 0, 0)
      if (filters.dueDateFilter === 'overdue' && due >= now) return false
      if (filters.dueDateFilter === 'on-time' && due < now) return false
      if (filters.dueDateFilter === 'custom' && filters.customDueDate) {
        const custom = new Date(filters.customDueDate)
        custom.setHours(0, 0, 0, 0)
        if (due.getTime() !== custom.getTime()) return false
      }
    }
  }

  if (filters.searchQuery.trim() !== '') {
    const query = filters.searchQuery.toLowerCase()
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      false
    )
  }

  return true
}

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasksByProject: {} as Record<string, Task[]>,
    permissionsByProject: {} as Record<string, Record<string, boolean> | null>,
    loadedProjects: {} as Record<
      string,
      { workspaceId: string; loadedAt: number }
    >,
    currentProjectId: null as string | null,
    currentWorkspaceId: null as string | null,
    searchQuery: '',
    statusFilter: 'all',
    priorityFilter: 'all',
    dueDateFilter: 'all',
    customDueDate: null as string | null,
    scopeFilter: 'all' as string,
    scopeUserId: null as string | null,
    isLoading: true,
    isGuestMode: false,
    loadedWorkspaces: {} as Record<string, boolean>
  }),

  getters: {
    tasks: (state): Task[] => {
      if (!state.currentProjectId) return []
      return state.tasksByProject[state.currentProjectId] || []
    },
    memberPermissions: (state): Record<string, boolean> | null => {
      if (!state.currentProjectId) return null
      return state.permissionsByProject[state.currentProjectId] ?? null
    },
    activeTasks(state): Task[] {
      const base = this.currentProjectId ? this.tasks : this.workspaceTasks
      return base.filter((task: Task) =>
        isTaskMatchingFilters(task, state, true)
      )
    },
    totalTasks(): number {
      return this.activeTasks.length
    },
    completedTasks(): number {
      return this.activeTasks.filter(
        (task: Task) => task.status === 'completed'
      ).length
    },
    inProgressTasks(): number {
      return this.activeTasks.filter(
        (task: Task) => task.status === 'inProgress'
      ).length
    },
    pendingTasks(): number {
      return this.activeTasks.filter((task: Task) => task.status === 'pending')
        .length
    },
    urgentTasks(): number {
      return this.activeTasks.filter(
        (task: Task) => task.priority === 'urgent' && task.status === 'pending'
      ).length
    },
    completionPercentage(): number {
      const total = this.tasks.length
      const completed = this.tasks.filter(
        (task: Task) => task.status === 'completed'
      ).length
      return total > 0 ? Math.round((completed / total) * 100) : 0
    },
    canCreateTasks(state): boolean {
      if (state.isGuestMode) return true
      const projectStore = useProjectStore()
      return hasAnyPermission(projectStore.memberRole, this.memberPermissions, [
        PERMISSIONS.MANAGE_TASKS,
        PERMISSIONS.CREATE_TASKS
      ])
    },
    canDeleteTasks(state): boolean {
      if (state.isGuestMode) return true
      const projectStore = useProjectStore()
      return hasAnyPermission(projectStore.memberRole, this.memberPermissions, [
        PERMISSIONS.MANAGE_TASKS,
        PERMISSIONS.DELETE_TASKS
      ])
    },
    canEditTasks(state): boolean {
      if (state.isGuestMode) return true
      const projectStore = useProjectStore()
      return hasAnyPermission(projectStore.memberRole, this.memberPermissions, [
        PERMISSIONS.MANAGE_TASKS,
        PERMISSIONS.EDIT_TASKS
      ])
    },
    canManageTasks(state): boolean {
      if (state.isGuestMode) return true
      const projectStore = useProjectStore()
      return hasAnyPermission(projectStore.memberRole, this.memberPermissions, [
        PERMISSIONS.MANAGE_TASKS
      ])
    },
    canToggleTaskStatus(state): boolean {
      if (state.isGuestMode) return true
      const projectStore = useProjectStore()
      return hasAnyPermission(projectStore.memberRole, this.memberPermissions, [
        PERMISSIONS.TOGGLE_STATUS
      ])
    },
    workspaceTasks(): Task[] {
      if (!this.currentWorkspaceId) return []
      const projectStore = useProjectStore()
      const workspaceTaskBuckets = projectStore.projects
        .filter((p) => p.workspaceId === this.currentWorkspaceId)
        .map((p) => getTaskBucketKey(p.id))

      let allTasks: Task[] = []
      for (const bucketKey of workspaceTaskBuckets) {
        const tasks = this.tasksByProject[bucketKey]
        if (tasks) allTasks = allTasks.concat(tasks)
      }

      allTasks.sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return bTime - aTime
      })

      return allTasks
    },
    filteredWorkspaceTasks(state): Task[] {
      return this.workspaceTasks.filter((task: Task) =>
        isTaskMatchingFilters(task, state)
      )
    },
    filteredTasks(state): Task[] {
      return this.tasks.filter((task: Task) =>
        isTaskMatchingFilters(task, state)
      )
    }
  },

  actions: {
    async getAuthToken(): Promise<string | null> {
      const { user } = useAuth()
      if (!user.value) return null
      return await user.value.getIdToken()
    },

    getWorkspaceId(): string | undefined {
      const projectStore = useProjectStore()
      const project = projectStore.projects.find(
        (p) => p.id === this.currentProjectId
      )
      return project?.workspaceId || this.currentWorkspaceId || undefined
    },

    updateProjectCounters(
      projectId: string,
      taskCountDelta: number,
      completedCountDelta: number
    ) {
      const projectStore = useProjectStore()
      const project = projectStore.projects.find((p) => p.id === projectId)
      if (!project) return
      project.taskCount = (project.taskCount || 0) + taskCountDelta
      project.completedTaskCount =
        (project.completedTaskCount || 0) + completedCountDelta
    },

    updateProjectAssigneeIds(projectId: string) {
      const projectStore = useProjectStore()
      const project = projectStore.projects.find((p) => p.id === projectId)
      if (!project) return
      const bucketKey = getTaskBucketKey(projectId)
      const tasks = this.tasksByProject[bucketKey] || []
      const assigneeSet = new Set<string>()
      tasks.forEach((t) => {
        ;(t.assigneeIds || []).forEach((id: string) => assigneeSet.add(id))
      })
      project.assigneeIds = Array.from(assigneeSet)
    },

    resolveTaskBucket(taskId: string): string | null {
      if (this.currentProjectId) {
        const currentProjectBucket = getTaskBucketKey(this.currentProjectId)
        const tasks = this.tasksByProject[currentProjectBucket]
        if (tasks?.some((t) => t.id === taskId)) {
          return currentProjectBucket
        }
      }

      for (const [bucketKey, tasks] of Object.entries(this.tasksByProject)) {
        if (tasks.some((t) => t.id === taskId)) {
          return bucketKey
        }
      }
      return null
    },

    resolveTaskForUpdate(
      taskId: string
    ): { bucketKey: string; task: Task } | null {
      const bucketKey = this.resolveTaskBucket(taskId)
      if (!bucketKey) return null
      const task = this.tasksByProject[bucketKey]?.find((t) => t.id === taskId)
      if (!task) return null
      return { bucketKey, task }
    },

    async setCurrentProject(
      projectId: string | null,
      userId: string | null = null,
      workspaceId?: string,
      forceReload: boolean = false
    ) {
      this.currentProjectId = projectId
      this.currentWorkspaceId = workspaceId || null

      if (!projectId) {
        return
      }

      const cachedProject = this.loadedProjects[projectId]
      if (
        !forceReload &&
        cachedProject &&
        cachedProject.workspaceId === workspaceId
      ) {
        if (workspaceId && !this.permissionsByProject[projectId]) {
          await this.loadProjectPermissions(projectId, userId, workspaceId)
        }
        this.isLoading = false
        return
      }

      if (
        !forceReload &&
        workspaceId &&
        this.loadedWorkspaces[workspaceId] &&
        this.tasksByProject[getTaskBucketKey(projectId)]
      ) {
        await this.loadProjectPermissions(projectId, userId, workspaceId)
        this.loadedProjects[projectId] = {
          workspaceId: workspaceId,
          loadedAt: Date.now()
        }
        this.isLoading = false
        return
      }

      await this.loadTasksForProject(projectId, userId, workspaceId)
    },

    async loadProjectPermissions(
      projectId: string,
      userId: string | null,
      workspaceId: string
    ) {
      if (!userId) return
      const { $firestore } = useNuxtApp()
      const projectStore = useProjectStore()
      const workspacePermissions = projectStore.memberPermissions || {}
      const filteredWorkspacePerms: Record<string, boolean> = {}
      for (const [key, val] of Object.entries(workspacePermissions)) {
        if (WORKSPACE_PERMISSION_SET.has(key)) {
          filteredWorkspacePerms[key] = val
        }
      }
      const userAssignmentRef = doc(
        $firestore,
        'workspaces',
        workspaceId,
        'projects',
        projectId,
        'members',
        userId
      )
      const userAssignmentSnap = await getDoc(userAssignmentRef)
      let taskPermissions: Record<string, boolean> = {}
      if (userAssignmentSnap.exists()) {
        const assignmentData = userAssignmentSnap.data()
        if (assignmentData.role === 'admin') {
          taskPermissions = {
            'manage-tasks': true,
            'create-tasks': true,
            'edit-tasks': true,
            'delete-tasks': true,
            'toggle-status': true
          }
        } else {
          taskPermissions = assignmentData.permissions || {}
        }
      }
      this.permissionsByProject[projectId] = {
        ...filteredWorkspacePerms,
        ...taskPermissions
      }
    },

    async loadTasksForProject(
      projectId: string,
      userId: string | null = null,
      workspaceId?: string
    ) {
      const { $firestore } = useNuxtApp()

      try {
        this.isLoading = true

        let loadedTasks: Task[] = []

        if (userId && workspaceId) {
          this.isGuestMode = false

          await this.loadProjectPermissions(projectId, userId, workspaceId)

          const tasksRef = collection(
            $firestore,
            'workspaces',
            workspaceId,
            'tasks'
          )
          const q = query(tasksRef, where('projectId', '==', projectId))
          const snapshot = await getDocs(q)

          if (!snapshot.empty) {
            loadedTasks = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as Task[]
          }

          this.tasksByProject[projectId] = loadedTasks
        } else {
          this.isGuestMode = true
          this.permissionsByProject[projectId] = null
          const localTasks = localStorage.getItem(`localTasks_${projectId}`)
          loadedTasks = localTasks ? JSON.parse(localTasks) : []
          this.tasksByProject[projectId] = loadedTasks
        }

        this.loadedProjects[projectId] = {
          workspaceId: workspaceId || '',
          loadedAt: Date.now()
        }
      } catch (error) {
        console.error('Error loading tasks:', error)
        showErrorToast('Failed to load tasks')
      } finally {
        this.isLoading = false
      }
    },

    async reloadTasks(userId: string | null = null) {
      if (!this.currentProjectId || !this.currentWorkspaceId) return
      await this.loadTasksForProject(
        this.currentProjectId,
        userId,
        this.currentWorkspaceId
      )
    },

    clearProjectCache(projectId: string) {
      const { [projectId]: _tasks, ...restTasks } = this.tasksByProject
      const { [projectId]: _loaded, ...restLoaded } = this.loadedProjects
      const { [projectId]: _perms, ...restPerms } = this.permissionsByProject
      this.tasksByProject = restTasks
      this.loadedProjects = restLoaded
      this.permissionsByProject = restPerms
    },

    clearCache() {
      this.tasksByProject = {}
      this.loadedProjects = {}
      this.permissionsByProject = {}
      this.loadedWorkspaces = {}
      this.currentProjectId = null
      this.currentWorkspaceId = null
    },

    clearWorkspaceCache(workspaceId: string) {
      const { [workspaceId]: _workspace, ...restLoadedWorkspaces } =
        this.loadedWorkspaces
      this.loadedWorkspaces = restLoadedWorkspaces

      const projectStore = useProjectStore()
      const workspaceProjectIds = projectStore.projects
        .filter((p) => p.workspaceId === workspaceId)
        .map((p) => p.id)
      const bucketKeys = workspaceProjectIds.map((projectId) =>
        getTaskBucketKey(projectId)
      )

      this.tasksByProject = Object.fromEntries(
        Object.entries(this.tasksByProject).filter(
          ([bucketKey]) => !bucketKeys.includes(bucketKey)
        )
      )

      this.loadedProjects = Object.fromEntries(
        Object.entries(this.loadedProjects).filter(
          ([bucketKey]) => !bucketKeys.includes(bucketKey)
        )
      )
    },

    async loadWorkspaceTasks(
      workspaceId: string,
      userId: string | undefined,
      forceReload = false
    ) {
      this.currentWorkspaceId = workspaceId

      if (!userId) {
        this.isGuestMode = true
        const projectStore = useProjectStore()
        const localProjects = projectStore.projects.filter(
          (p) => p.workspaceId === workspaceId
        )
        for (const project of localProjects) {
          const bucketKey = getTaskBucketKey(project.id)
          if (!this.tasksByProject[bucketKey]) {
            const localTasks = localStorage.getItem(`localTasks_${project.id}`)
            this.tasksByProject[bucketKey] = localTasks
              ? JSON.parse(localTasks)
              : []
          }
        }
        this.loadedWorkspaces[workspaceId] = true
        this.isLoading = false
        return
      }

      this.isGuestMode = false

      if (!forceReload && this.loadedWorkspaces[workspaceId]) {
        this.isLoading = false
        return
      }

      const { $firestore } = useNuxtApp()
      const projectStore = useProjectStore()

      try {
        this.isLoading = true

        const accessibleProjectIds = projectStore.projects.map((p) => p.id)

        const tasksRef = collection(
          $firestore,
          `workspaces/${workspaceId}/tasks`
        )
        const q = query(tasksRef, orderBy('updatedAt', 'desc'))

        const snapshot = await getDocs(q)

        const grouped: Record<string, Task[]> = {}
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data()
          const projectId = data.projectId as string
          if (!accessibleProjectIds.includes(projectId)) return
          const task: Task = {
            id: docSnap.id,
            ...(data as Omit<Task, 'id'>),
            projectId
          }
          const bucketKey = getTaskBucketKey(projectId)
          if (!grouped[bucketKey]) grouped[bucketKey] = []
          grouped[bucketKey].push(task)
        })

        for (const [bucketKey, projectTasks] of Object.entries(grouped)) {
          this.tasksByProject[bucketKey] = projectTasks
        }

        for (const bucketKey of Object.keys(grouped)) {
          this.loadedProjects[bucketKey] = {
            workspaceId,
            loadedAt: Date.now()
          }
        }

        this.loadedWorkspaces[workspaceId] = true
      } catch (error) {
        console.error('Error loading workspace tasks:', error)
        showErrorToast('Failed to load workspace tasks')
      } finally {
        this.isLoading = false
      }
    },

    async addTask(
      task: Pick<
        Task,
        | 'title'
        | 'description'
        | 'priority'
        | 'status'
        | 'dueDate'
        | 'projectId'
      >,
      userId: string | null = null,
      workspaceId?: string,
      memberIds?: string[]
    ) {
      const projectId = task.projectId
      const bucketKey = getTaskBucketKey(projectId)

      if (!this.tasksByProject[bucketKey]) {
        this.tasksByProject[bucketKey] = []
      }

      if (!userId || !workspaceId) {
        const taskId = crypto.randomUUID()
        const now = new Date().toISOString()
        const taskWithData: Task = {
          ...task,
          id: taskId,
          projectId,
          createdAt: now,
          updatedAt: now
        }
        this.tasksByProject[bucketKey].push(taskWithData)
        this.updateProjectCounters(
          projectId,
          1,
          isCompletedStatus(taskWithData.status) ? 1 : 0
        )
        localStorage.setItem(
          `localTasks_${bucketKey}`,
          JSON.stringify(this.tasksByProject[bucketKey])
        )
        const projectStore = useProjectStore()
        projectStore.saveLocalProjects()
        return
      }

      const tempId = crypto.randomUUID()
      const now = new Date().toISOString()
      const assignments: Record<string, TaskAssignment> = {}
      if (memberIds) {
        for (const id of memberIds) {
          assignments[id] = {
            role: 'assignee',
            assignedAt: now,
            assignedBy: userId ?? undefined
          }
        }
      }
      const optimisticTask: Task = {
        ...task,
        id: tempId,
        projectId,
        createdAt: now,
        updatedAt: now,
        assigneeIds: memberIds || [],
        assignments
      }
      this.tasksByProject[bucketKey].push(optimisticTask)
      this.updateProjectCounters(
        projectId,
        1,
        isCompletedStatus(optimisticTask.status) ? 1 : 0
      )
      this.updateProjectAssigneeIds(projectId)

      try {
        const token = await this.getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ success: boolean; task: Task }>(
          '/api/tasks',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
              workspaceId,
              projectId,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              memberIds
            }
          }
        )

        if (response.success && response.task) {
          const responseBucket = getTaskBucketKey(response.task.projectId)
          if (responseBucket !== bucketKey) {
            this.tasksByProject[bucketKey] = this.tasksByProject[
              bucketKey
            ].filter((t) => t.id !== tempId)
            if (!this.tasksByProject[responseBucket]) {
              this.tasksByProject[responseBucket] = []
            }
            this.tasksByProject[responseBucket].push(response.task)
            return
          }

          const idx = this.tasksByProject[bucketKey].findIndex(
            (t) => t.id === tempId
          )
          if (idx !== -1) {
            this.tasksByProject[bucketKey][idx] = response.task
          }
        }
      } catch (error) {
        console.error('Error adding task:', error)
        this.tasksByProject[bucketKey] = this.tasksByProject[bucketKey].filter(
          (t) => t.id !== tempId
        )
        this.updateProjectCounters(
          projectId,
          -1,
          isCompletedStatus(optimisticTask.status) ? -1 : 0
        )
        showErrorToast('Failed to add task')
      }
    },

    async updateTask(
      id: string,
      updatedTask: Partial<Task>,
      userId: string | null = null,
      memberIds?: string[]
    ) {
      const taskData = this.resolveTaskForUpdate(id)
      if (!taskData) return
      const { bucketKey, task: existingTask } = taskData

      const projectTasks = this.tasksByProject[bucketKey]
      if (!projectTasks) return

      const taskIndex = projectTasks.findIndex((task) => task.id === id)
      if (taskIndex === -1) return

      if (!userId) {
        const oldStatus = projectTasks[taskIndex].status
        projectTasks[taskIndex] = { ...projectTasks[taskIndex], ...updatedTask }
        if (updatedTask.status && updatedTask.status !== oldStatus) {
          const completedDelta = getCompletedDelta(
            oldStatus,
            updatedTask.status
          )
          this.updateProjectCounters(
            projectTasks[taskIndex].projectId,
            0,
            completedDelta
          )
          const projectStore = useProjectStore()
          projectStore.saveLocalProjects()
        }
        localStorage.setItem(
          `localTasks_${bucketKey}`,
          JSON.stringify(projectTasks)
        )
        return
      }

      const snapshot = { ...projectTasks[taskIndex] }
      let optimisticUpdate: Partial<Task> = updatedTask
      if (memberIds) {
        const now = new Date().toISOString()
        const newAssignments: Record<string, TaskAssignment> = {}
        for (const id of memberIds) {
          newAssignments[id] = snapshot.assignments?.[id] || {
            role: 'assignee',
            assignedAt: now,
            assignedBy: userId ?? undefined
          }
        }
        optimisticUpdate = {
          ...updatedTask,
          assigneeIds: memberIds,
          assignments: newAssignments
        }
      }
      projectTasks[taskIndex] = {
        ...projectTasks[taskIndex],
        ...optimisticUpdate
      }

      const statusChanged =
        updatedTask.status !== undefined &&
        updatedTask.status !== snapshot.status
      const completedDelta = statusChanged
        ? getCompletedDelta(snapshot.status, updatedTask.status as Status)
        : 0
      if (completedDelta !== 0) {
        this.updateProjectCounters(existingTask.projectId, 0, completedDelta)
      }
      if (memberIds) {
        this.updateProjectAssigneeIds(existingTask.projectId)
      }

      try {
        const workspaceId = this.getWorkspaceId()
        if (!workspaceId) return

        const token = await this.getAuthToken()
        if (!token) throw new Error('Not authenticated')

        await $fetch<{ success: boolean }>(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            workspaceId,
            projectId: existingTask.projectId,
            ...updatedTask,
            memberIds
          }
        })
      } catch (error) {
        console.error('Error updating task:', error)
        const currentIndex = projectTasks.findIndex((t) => t.id === id)
        if (currentIndex !== -1) {
          projectTasks[currentIndex] = snapshot
        }
        if (completedDelta !== 0) {
          this.updateProjectCounters(existingTask.projectId, 0, -completedDelta)
        }
        if (memberIds) {
          this.updateProjectAssigneeIds(existingTask.projectId)
        }
        showErrorToast('Failed to update task')
      }
    },

    async deleteTask(id: string, userId: string | null = null) {
      const taskData = this.resolveTaskForUpdate(id)
      if (!taskData) return
      const { bucketKey, task: existingTask } = taskData

      if (!userId) {
        const deletedForCounter = (this.tasksByProject[bucketKey] || []).find(
          (task) => task.id === id
        )
        this.tasksByProject[bucketKey] = (
          this.tasksByProject[bucketKey] || []
        ).filter((task) => task.id !== id)
        if (deletedForCounter) {
          this.updateProjectCounters(
            existingTask.projectId,
            -1,
            isCompletedStatus(deletedForCounter.status) ? -1 : 0
          )
          const projectStore = useProjectStore()
          projectStore.saveLocalProjects()
        }
        localStorage.setItem(
          `localTasks_${bucketKey}`,
          JSON.stringify(this.tasksByProject[bucketKey])
        )
        return
      }

      const projectTasks = this.tasksByProject[bucketKey] || []
      const deletedIndex = projectTasks.findIndex((task) => task.id === id)
      if (deletedIndex === -1) return
      const deletedTask = { ...projectTasks[deletedIndex] }
      this.tasksByProject[bucketKey] = projectTasks.filter(
        (task) => task.id !== id
      )
      this.updateProjectCounters(
        existingTask.projectId,
        -1,
        isCompletedStatus(deletedTask.status) ? -1 : 0
      )
      this.updateProjectAssigneeIds(existingTask.projectId)

      try {
        const workspaceId = this.getWorkspaceId()
        if (!workspaceId) return

        const token = await this.getAuthToken()
        if (!token) throw new Error('Not authenticated')

        await $fetch<{ success: boolean }>(`/api/tasks/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            workspaceId,
            projectId: existingTask.projectId
          }
        })
      } catch (error) {
        console.error('Error deleting task:', error)
        const currentTasks = this.tasksByProject[bucketKey] || []
        const insertIndex = Math.min(deletedIndex, currentTasks.length)
        currentTasks.splice(insertIndex, 0, deletedTask)
        this.tasksByProject[bucketKey] = currentTasks
        this.updateProjectCounters(
          existingTask.projectId,
          1,
          isCompletedStatus(deletedTask.status) ? 1 : 0
        )
        this.updateProjectAssigneeIds(existingTask.projectId)
        showErrorToast('Failed to delete task')
      }
    },

    async toggleTaskStatus(
      id: string,
      checked: boolean,
      userId: string | null = null
    ) {
      const bucketKey = this.resolveTaskBucket(id)
      if (!bucketKey) return

      const projectTasks = this.tasksByProject[bucketKey]
      if (!projectTasks) return

      const status = checked ? 'completed' : 'pending'

      const taskIndex = projectTasks.findIndex((task) => task.id === id)
      if (taskIndex === -1) return

      const previousStatus = projectTasks[taskIndex].status
      if (previousStatus === status) return
      projectTasks[taskIndex].status = status
      const completedDelta = getCompletedDelta(previousStatus, status)
      this.updateProjectCounters(
        projectTasks[taskIndex].projectId,
        0,
        completedDelta
      )

      if (userId) {
        try {
          await this.updateTask(id, { status }, userId)
        } catch {
          projectTasks[taskIndex].status = previousStatus
          this.updateProjectCounters(
            projectTasks[taskIndex].projectId,
            0,
            -completedDelta
          )
          showErrorToast('Failed to update task status')
        }
      }
    },

    updateLocalTaskStatus(id: string, status: Status) {
      const bucketKey = this.resolveTaskBucket(id)
      if (!bucketKey) return

      const projectTasks = this.tasksByProject[bucketKey]
      if (!projectTasks) return

      const taskIndex = projectTasks.findIndex((task) => task.id === id)
      if (taskIndex === -1) return

      const previousStatus = projectTasks[taskIndex].status
      projectTasks[taskIndex].status = status

      if (status !== previousStatus) {
        const completedDelta = getCompletedDelta(previousStatus, status)
        this.updateProjectCounters(
          projectTasks[taskIndex].projectId,
          0,
          completedDelta
        )
      }

      const localTasks = localStorage.getItem(`localTasks_${bucketKey}`)
      if (localTasks) {
        localStorage.setItem(
          `localTasks_${bucketKey}`,
          JSON.stringify(projectTasks)
        )
      }
    },

    async syncTaskStatusToServer(
      id: string,
      status: Status,
      userId: string | null = null
    ) {
      if (!userId) return

      await this.updateTask(id, { status }, userId)
    },

    setSearchQuery(query: string | null) {
      this.searchQuery = query || ''
    },

    setStatusFilter(status: string | null) {
      this.statusFilter = status || 'all'
    },

    setPriorityFilter(priority: string | null) {
      this.priorityFilter = priority || 'all'
    },

    setDueDateFilter(filter: string | null) {
      this.dueDateFilter = filter || 'all'
      if (filter !== 'custom') this.customDueDate = null
    },

    setScopeFilter(scope: string, userId?: string | null) {
      this.scopeFilter = scope || 'all'
      if (userId !== undefined) this.scopeUserId = userId || null
    },

    resetFilters() {
      this.searchQuery = ''
      this.statusFilter = 'all'
      this.priorityFilter = 'all'
      this.dueDateFilter = 'all'
      this.customDueDate = null
      this.scopeFilter = 'all'
      this.scopeUserId = null
    },

    setCustomDueDate(date: string | null) {
      this.customDueDate = date
      if (date) this.dueDateFilter = 'custom'
    }
  }
})
