<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  Plus,
  ArrowLeft,
  RefreshCw,
  Users,
  ChevronDown,
  Search
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
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

const memberSearch = ref('')

const filteredAssignedMembers = computed(() => {
  const query = memberSearch.value.toLowerCase().trim()
  if (!query) return assignedMembers.value
  return assignedMembers.value.filter((m) =>
    (m.username || '').toLowerCase().includes(query)
  )
})

const firstAssignedMember = computed(() => assignedMembers.value[0] || null)
const otherAssignedMembers = computed(() => assignedMembers.value.slice(1))
const hasMultipleAssigned = computed(() => assignedMembers.value.length > 1)

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
  return projectStore.visibleProjects.find((p) => p.id === projectId)
})

const isCreateButtonPermissionLoading = computed(() => {
  if (taskStore.isGuestMode) return false
  const hasLoadedPermissions = Object.prototype.hasOwnProperty.call(
    taskStore.permissionsByProject,
    projectId
  )
  return (
    !hasLoadedPermissions && (projectStore.isLoading || taskStore.isLoading)
  )
})

const handleMembersUpdated = async () => {
  await loadAllProjectAssignments(workspaceId, [projectId], true)
}

onMounted(async () => {
  taskStore.setScopeFilter('assigneds', user.value?.uid)
  await projectStore.loadProjectsForWorkspace(workspaceId, user.value?.uid)

  // Check if user has access to this project
  if (!projectStore.visibleProjects.find((p) => p.id === projectId)) {
    return
  }

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
            class="text-2xl font-bold text-primary mb-2 flex items-center gap-2 break-all min-w-0"
          >
            <span v-if="currentProject.emoji">{{ currentProject.emoji }}</span>
            {{ currentProject.title }}
          </h1>
          <p
            v-if="currentProject.description"
            class="text-muted-foreground break-all"
          >
            {{ currentProject.description }}
          </p>

          <!-- Members Section -->
          <div class="mt-4 flex items-center gap-3">
            <div
              v-if="firstAssignedMember && !hasMultipleAssigned"
              class="flex items-center gap-2"
            >
              <Avatar :uid="firstAssignedMember.uid" class="h-6 w-6 shrink-0">
                <AvatarImage
                  v-if="firstAssignedMember.avatarUrl"
                  :src="firstAssignedMember.avatarUrl"
                  :alt="firstAssignedMember.username || ''"
                />
                <AvatarFallback class="text-[10px]">
                  {{
                    firstAssignedMember.username?.charAt(0).toUpperCase() || '?'
                  }}
                </AvatarFallback>
              </Avatar>
              <span class="text-sm">{{
                firstAssignedMember.username || 'Unknown'
              }}</span>
            </div>
            <div v-else-if="firstAssignedMember">
              <DropdownMenu
                @update:open="
                  (open: boolean) => {
                    if (!open) memberSearch = ''
                  }
                "
              >
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="outline"
                    size="sm"
                    class="max-w-full hover:bg-muted/80 cursor-pointer"
                  >
                    <Avatar
                      :uid="firstAssignedMember.uid"
                      class="h-5 w-5 shrink-0"
                    >
                      <AvatarImage
                        v-if="firstAssignedMember.avatarUrl"
                        :src="firstAssignedMember.avatarUrl"
                        :alt="firstAssignedMember.username || ''"
                      />
                      <AvatarFallback class="text-[10px]">
                        {{
                          firstAssignedMember.username
                            ?.charAt(0)
                            .toUpperCase() || '?'
                        }}
                      </AvatarFallback>
                    </Avatar>
                    <span class="text-sm truncate">{{
                      firstAssignedMember.username || 'Unknown'
                    }}</span>
                    <span class="text-xs text-muted-foreground"
                      >+{{ otherAssignedMembers.length }}</span
                    >
                    <ChevronDown class="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" class="w-52">
                  <div class="px-2 py-1.5">
                    <div class="relative">
                      <Search
                        class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
                      />
                      <Input
                        v-model="memberSearch"
                        type="text"
                        placeholder="Search..."
                        class="h-8 pl-7 text-sm"
                        @keydown.stop
                      />
                    </div>
                  </div>
                  <div class="max-h-48 overflow-y-auto overflow-x-hidden">
                    <DropdownMenuItem
                      v-for="member in filteredAssignedMembers"
                      :key="member.uid"
                      class="flex items-center gap-2"
                      @select.prevent
                    >
                      <Avatar :uid="member.uid" class="h-5 w-5 shrink-0">
                        <AvatarImage
                          v-if="member.avatarUrl"
                          :src="member.avatarUrl"
                          :alt="member.username || ''"
                        />
                        <AvatarFallback class="text-[10px]">
                          {{ member.username?.charAt(0).toUpperCase() || '?' }}
                        </AvatarFallback>
                      </Avatar>
                      <span class="text-sm truncate">{{
                        member.username || 'Unknown'
                      }}</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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

    <div
      v-if="currentProject || projectStore.isLoading"
      class="-mx-6 border-b border-border mb-6"
    />

    <div
      v-if="currentProject || projectStore.isLoading"
      class="max-w-6xl mx-auto"
    >
      <div
        class="flex sm:justify-between flex-col sm:flex-row sm:items-center justify-center mb-6"
      >
        <div>
          <h2 class="text-xl font-semibold">Project Tasks</h2>
          <p class="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <template v-if="taskStore.isLoading">
              <Skeleton class="h-4 w-10 inline-block" />
              <Skeleton class="h-4 w-24 inline-block ml-1" />
            </template>
            <template v-else>
              {{ taskStore.totalTasks }}
              {{ taskStore.totalTasks === 1 ? 'task' : 'tasks' }}
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
            v-else-if="taskStore.canCreateTasks"
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
