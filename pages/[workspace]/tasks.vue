<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import TaskItem from '@/components/tasks/TaskItem.vue'
import TaskFilters from '@/components/tasks/TaskFilters.vue'
import TaskForm from '@/components/tasks/TaskForm.vue'
import { useAuth } from '@/composables/useAuth'
import { useWorkspace } from '@/composables/useWorkspace'
import { useMembers } from '@/composables/useMembers'
import { useProjectPermissions } from '@/composables/useProjectPermissions'
import {
  PERMISSIONS,
  isOwnerOrAdmin,
  hasProjectPermission
} from '@/constants/permissions'

definePageMeta({ layout: 'workspace' })

const { user } = useAuth()
const { workspaceId } = useWorkspace()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const { members, loadWorkspaceMembers } = useMembers()
const {
  projectPermissionsMap,
  isLoading: isProjectPermissionsLoading,
  loadProjectPermissions
} = useProjectPermissions()

const isInitialLoading = ref(
  !(workspaceId.value && taskStore.loadedWorkspaces[workspaceId.value])
)
const isReloading = ref(false)
const isAddingTask = ref(false)

const filteredWorkspaceTasks = computed(() => taskStore.filteredWorkspaceTasks)

const canCreateWorkspaceTasks = computed(() => {
  if (projectStore.isGuestMode) return true
  if (isOwnerOrAdmin(projectStore.memberRole)) return true

  // Check if user has CREATE_TASKS in any project
  for (const perms of Object.values(projectPermissionsMap.value)) {
    if (hasProjectPermission(null, perms, PERMISSIONS.CREATE_TASKS)) return true
  }
  return false
})

const isCreateButtonPermissionLoading = computed(() => {
  if (projectStore.isGuestMode) return false
  if (isOwnerOrAdmin(projectStore.memberRole)) return false
  return isInitialLoading.value || isProjectPermissionsLoading.value
})

// Get project name for a task
const getProjectName = (projectId?: string) => {
  if (!projectId) return undefined
  const project = projectStore.projects.find((p) => p.id === projectId)
  return project?.title || 'Unknown Project'
}

// Load data on mount and when scope changes
onMounted(async () => {
  if (workspaceId.value) {
    taskStore.currentProjectId = null
    try {
      const loadPromises: Promise<void>[] = [
        projectStore.loadProjectsForWorkspace(
          workspaceId.value,
          user.value?.uid
        )
      ]
      if (user.value?.uid) {
        loadPromises.push(loadWorkspaceMembers(workspaceId.value))
      }
      await Promise.all(loadPromises)
      taskStore.setScopeFilter('assigneds', user.value?.uid)
      // Load tasks via taskStore (will use cache if available)
      await taskStore.loadWorkspaceTasks(
        workspaceId.value,
        'assigneds',
        user.value?.uid
      )

      // Load permissions for all projects
      const projectIds = projectStore.projects.map((p) => p.id)
      if (user.value?.uid && projectIds.length > 0) {
        await loadProjectPermissions(
          workspaceId.value,
          projectIds,
          user.value.uid
        )
      }
    } finally {
      isInitialLoading.value = false
    }
  } else {
    isInitialLoading.value = false
  }
})

// When scope changes, load all tasks if needed (for 'all' or filtering by another member)
watch(
  [() => taskStore.scopeFilter, () => taskStore.scopeUserId],
  async ([newScope, newUserId]) => {
    if (!workspaceId.value) return
    const needsAllData =
      newScope === 'all' ||
      (newScope === 'assigneds' && newUserId && newUserId !== user.value?.uid)
    if (needsAllData) {
      await taskStore.loadWorkspaceTasks(
        workspaceId.value,
        'all',
        user.value?.uid
      )
    }
  }
)

// Force reload when clicking Sync button
const handleReload = async () => {
  if (!workspaceId.value) return
  isReloading.value = true
  try {
    taskStore.clearWorkspaceCache(workspaceId.value)
    await taskStore.loadWorkspaceTasks(
      workspaceId.value,
      taskStore.scopeFilter as 'all' | 'assigneds',
      user.value?.uid,
      true
    )
  } finally {
    isReloading.value = false
  }
}

const emptyStateMessage = computed(() => {
  if (taskStore.workspaceTasks.length > 0) {
    return 'No tasks found. Try adjusting your filters.'
  }
  if (taskStore.scopeFilter === 'assigneds') {
    return 'No tasks assigned to you yet.'
  }
  return 'No tasks in this workspace yet.'
})
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-primary mb-2">Tasks</h1>
      <p class="text-muted-foreground">
        View and manage tasks across all projects
      </p>
    </header>

    <div class="space-y-4 mb-6">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h2 class="text-xl font-semibold">Workspace Tasks</h2>
          <p class="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <template v-if="isInitialLoading || taskStore.isLoading">
              <Skeleton class="h-4 w-10 inline-block" />
              <Skeleton class="h-4 w-24 inline-block ml-1" />
            </template>
            <template v-else>
              {{ filteredWorkspaceTasks.length }}
              {{ filteredWorkspaceTasks.length === 1 ? 'task' : 'tasks' }}
              <span
                v-if="taskStore.urgentTasks > 0"
                class="text-red-600 font-medium"
              >
                &middot; {{ taskStore.urgentTasks }} urgent pending
              </span>
            </template>
          </p>
        </div>

        <div
          class="flex sm:flex-row items-center mt-3 sm:mt-0 flex-row-reverse justify-end gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            :disabled="taskStore.isLoading || isReloading"
            @click="handleReload"
          >
            <RefreshCw
              class="h-4 w-4 mr-2"
              :class="{ 'animate-spin': isReloading }"
            />
            Sync
          </Button>

          <Skeleton
            v-if="isCreateButtonPermissionLoading"
            class="h-9 w-[124px] rounded-md"
          />

          <Button
            v-else-if="canCreateWorkspaceTasks"
            class="flex items-center gap-1"
            :disabled="projectStore.isLoading"
            @click="isAddingTask = true"
          >
            <Plus class="h-5 w-5" />
            <span>Add Task</span>
          </Button>
        </div>
      </div>
    </div>

    <TaskFilters />

    <div v-if="isInitialLoading || taskStore.isLoading" class="space-y-2">
      <Card
        v-for="i in 6"
        :key="`skeleton-${i}`"
        class="mb-3 hover:shadow-md transition-shadow"
      >
        <CardContent class="px-4">
          <div class="flex items-start gap-2">
            <Skeleton class="h-6 w-6 rounded-full" />
            <div class="flex-1 overflow-hidden">
              <div class="mb-2 flex min-h-6 min-w-0 items-center gap-2">
                <Skeleton class="h-5 w-full max-w-40" />
                <Skeleton class="h-5 min-w-16" />
              </div>
              <div
                class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
              >
                <div class="min-w-0 sm:flex-1">
                  <Skeleton class="h-4 w-32 max-w-full" />
                </div>
                <div
                  class="flex items-center justify-between gap-2 sm:justify-end"
                >
                  <Skeleton class="h-4 w-24 shrink-0" />
                  <div class="flex -space-x-2">
                    <Skeleton class="h-6 w-6 rounded-full" />
                    <Skeleton class="h-6 w-6 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <Skeleton class="h-6 w-6 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>

    <Alert v-else-if="filteredWorkspaceTasks.length === 0">
      <AlertDescription>{{ emptyStateMessage }}</AlertDescription>
    </Alert>

    <div v-else class="space-y-2">
      <TaskItem
        v-for="task in filteredWorkspaceTasks"
        :key="task.id"
        :task="task"
        :workspace-id="workspaceId || undefined"
        :workspace-members="members"
        :project-name="getProjectName(task.projectId)"
        :project-permissions="projectPermissionsMap[task.projectId]"
        :workspace-role="projectStore.memberRole"
        :workspace-permissions="projectStore.memberPermissions"
      />
    </div>

    <TaskForm
      :is-open="isAddingTask"
      :user-id="user?.uid"
      :workspace-id="workspaceId || undefined"
      @close="isAddingTask = false"
    />
  </div>
</template>
