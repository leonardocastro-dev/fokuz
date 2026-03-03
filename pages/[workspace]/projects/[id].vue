<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Plus, ArrowLeft, RefreshCw, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import TaskList from '@/components/tasks/TaskList.vue'
import TaskFilters from '@/components/tasks/TaskFilters.vue'
import TaskForm from '@/components/tasks/TaskForm.vue'
import ProjectMembersPermissionsModal from '@/components/projects/ProjectMembersPermissionsModal.vue'
import { useAuth } from '@/composables/useAuth'
import { useMembers } from '@/composables/useMembers'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const {
  members,
  loadWorkspaceMembers,
  projectAssignmentsMap,
  projectAssignmentsDataMap,
  loadAllProjectAssignments
} = useMembers()

const isAddingTask = ref(false)
const isReloading = ref(false)
const isMembersModalOpen = ref(false)
const taskStore = useTaskStore()
const projectStore = useProjectStore()

const canManageMembers = computed(() => {
  if (projectStore.canAssignProjectMembers) return true
  // Project admins can also manage members
  if (!user.value) return false
  const assignment =
    projectAssignmentsDataMap.value[projectId]?.[user.value.uid]
  return assignment?.role === 'admin'
})

const assignedMembers = computed(() => {
  const assignedIds = projectAssignmentsMap.value[projectId] || []
  return members.value.filter((m) => assignedIds.includes(m.uid))
})

const displayedMembers = computed(() => assignedMembers.value.slice(0, 5))
const extraMembersCount = computed(() =>
  Math.max(0, assignedMembers.value.length - 5)
)

const handleReload = async () => {
  isReloading.value = true
  try {
    await taskStore.reloadTasks(user.value?.uid)
  } finally {
    isReloading.value = false
  }
}

const projectId = route.params.id as string
const workspaceId = route.params.workspace as string

const currentProject = computed(() => {
  return projectStore.projects.find((p) => p.id === projectId)
})

const handleMembersUpdated = async () => {
  await loadAllProjectAssignments(workspaceId, [projectId], true)
}

onMounted(async () => {
  taskStore.setScopeFilter('assigneds', user.value?.uid)
  await projectStore.loadProjectsForWorkspace(workspaceId, user.value?.uid)
  if (user.value?.uid) {
    await loadWorkspaceMembers(workspaceId)
    await loadAllProjectAssignments(workspaceId, [projectId])
  }
  await taskStore.setCurrentProject(projectId, user.value?.uid, workspaceId)
})

// When scope changes, reload tasks if needed (for 'all' or filtering by another member)
watch(
  [() => taskStore.scopeFilter, () => taskStore.scopeUserId],
  async ([newScope, newUserId]) => {
    const needsAllData =
      newScope === 'all' ||
      (newScope === 'assigneds' && newUserId && newUserId !== user.value?.uid)
    if (needsAllData) {
      await taskStore.setCurrentProject(projectId, user.value?.uid, workspaceId)
    }
  }
)
</script>

<template>
  <div>
    <div class="max-w-6xl mx-auto">
      <header class="pb-6">
        <div class="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            class="flex items-center gap-1"
            @click="router.push(`/${workspaceId}/projects`)"
          >
            <ArrowLeft class="h-4 w-4" />
            <span>Back to Projects</span>
          </Button>
        </div>

        <div
          v-if="projectStore.isLoading"
          class="flex justify-between items-start"
        >
          <div class="flex-1">
            <Skeleton class="h-9 max-w-64 mb-2" />
            <Skeleton class="h-6 max-w-96 mb-3" />
          </div>
        </div>

        <div v-else-if="currentProject">
          <h1
            class="text-2xl font-bold text-primary mb-2 flex items-center gap-2"
          >
            <span v-if="currentProject.emoji">{{ currentProject.emoji }}</span>
            {{ currentProject.title }}
          </h1>
          <p v-if="currentProject.description" class="text-muted-foreground">
            {{ currentProject.description }}
          </p>

          <!-- Members Section -->
          <div class="mt-4 flex items-center gap-3">
            <div
              v-if="assignedMembers.length > 0"
              class="flex -space-x-2 *:data-[slot=avatar]:ring-gray-50 *:data-[slot=avatar]:ring-2"
            >
              <Avatar
                v-for="member in displayedMembers"
                :key="member.uid"
                :uid="member.uid"
                class="h-8 w-8"
              >
                <AvatarImage
                  v-if="member.avatarUrl"
                  :src="member.avatarUrl"
                  :alt="member.username || ''"
                />
                <AvatarFallback class="text-xs">
                  {{ member.username?.charAt(0).toUpperCase() || '?' }}
                </AvatarFallback>
              </Avatar>
              <Avatar v-if="extraMembersCount > 0" class="h-8 w-8">
                <AvatarFallback class="text-xs bg-muted">
                  +{{ extraMembersCount }}
                </AvatarFallback>
              </Avatar>
            </div>
            <span v-else class="text-sm text-muted-foreground">
              No members assigned
            </span>
            <Button
              v-if="canManageMembers"
              variant="outline"
              size="sm"
              class="flex items-center gap-1"
              @click="isMembersModalOpen = true"
            >
              <Users class="h-4 w-4" />
              Manage
            </Button>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <p class="text-muted-foreground">Project not found</p>
          <Button class="mt-4" @click="router.push(`/${workspaceId}/projects`)">
            Go to Projects
          </Button>
        </div>
      </header>
    </div>

    <div class="-mx-6 border-b border-border mb-6" />

    <div
      v-if="currentProject || projectStore.isLoading"
      class="max-w-6xl mx-auto"
    >
      <div
        class="flex sm:justify-between flex-col sm:flex-row sm:items-center justify-center mb-6"
      >
        <div>
          <h2 class="text-xl font-semibold">Project Tasks</h2>
          <p class="text-sm text-muted-foreground mt-1">
            {{ taskStore.totalTasks }}
            {{ taskStore.totalTasks === 1 ? 'task' : 'tasks' }}
            <span
              v-if="taskStore.urgentTasks > 0"
              class="text-red-600 font-medium"
            >
              &middot; {{ taskStore.urgentTasks }} urgent pending
            </span>
          </p>
        </div>
        <div
          class="flex sm:flex-row mt-3 sm:mt-0 flex-row-reverse justify-end gap-2"
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
          <Button
            v-if="taskStore.canCreateTasks"
            class="flex items-center gap-1"
            :disabled="projectStore.isLoading"
            @click="isAddingTask = true"
          >
            <Plus class="h-5 w-5" />
            <span>Add Task</span>
          </Button>
        </div>
      </div>

      <TaskFilters />
      <div class="-mx-6 border-b border-border mb-6" />
      <TaskList :workspace-id="workspaceId" :workspace-members="members" />

      <TaskForm
        :is-open="isAddingTask"
        :user-id="user?.uid"
        :workspace-id="workspaceId"
        :project-id="projectId"
        @close="isAddingTask = false"
      />

      <ProjectMembersPermissionsModal
        v-model:open="isMembersModalOpen"
        :project-id="projectId"
        :workspace-id="workspaceId"
        @members-updated="handleMembersUpdated"
      />
    </div>
  </div>
</template>
