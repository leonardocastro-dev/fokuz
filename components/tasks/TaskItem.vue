<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Check,
  MoreHorizontal,
  Lock,
  Trash2,
  PenLine,
  Clock,
  LoaderCircle,
  CircleDashed
} from 'lucide-vue-next'
import TaskForm from './TaskForm.vue'
import TaskInfos from './TaskInfos.vue'
import { useAuth } from '@/composables/useAuth'
import type { WorkspaceMember } from '@/composables/useMembers'
import { PERMISSIONS, hasAnyPermission } from '@/constants/permissions'

const props = defineProps<{
  task: Task
  workspaceId?: string
  workspaceMembers?: WorkspaceMember[]
  projectName?: string
  projectPermissions?: Record<string, boolean>
  workspaceRole?: string | null
  workspacePermissions?: Record<string, boolean> | null
}>()

const taskStore = useTaskStore()
const { user } = useAuth()
const isEditing = ref(false)
const showInfoModal = ref(false)

const isTransitioning = ref(false)

const handleEditFromInfo = () => {
  isTransitioning.value = true
  document.body.classList.add('sheet-transitioning')
  showInfoModal.value = false
  setTimeout(() => {
    isEditing.value = true
    setTimeout(() => {
      document.body.classList.remove('sheet-transitioning')
      requestAnimationFrame(() => {
        isTransitioning.value = false
      })
    }, 500)
  }, 300)
}

// Check project permissions first, then workspace role/permissions, then taskStore fallback
const checkPermission = (permissions: string[]) => {
  if (props.projectPermissions) {
    if (hasAnyPermission(null, props.projectPermissions, permissions))
      return true
  }
  if (props.workspaceRole || props.workspacePermissions) {
    if (
      hasAnyPermission(
        props.workspaceRole,
        props.workspacePermissions ?? null,
        permissions
      )
    )
      return true
  }
  return null
}

const canEdit = computed(() => {
  const result = checkPermission([
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.EDIT_TASKS
  ])
  return result ?? taskStore.canEditTasks
})

const canDelete = computed(() => {
  const result = checkPermission([
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.DELETE_TASKS
  ])
  return result ?? taskStore.canDeleteTasks
})

const canToggleStatus = computed(() => {
  const result = checkPermission([PERMISSIONS.TOGGLE_STATUS])
  return result ?? taskStore.canToggleTaskStatus
})

const hasAnyAction = computed(() => canEdit.value || canDelete.value)

const statusOptions: Array<{ value: Status; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
]

const isCompleted = computed(() => props.task.status === 'completed')

const availableStatusOptions = computed(() =>
  statusOptions.filter((option) => option.value !== props.task.status)
)

const getStatusIconClass = (status: Status) => {
  if (status === 'inProgress') return 'h-4 w-4 text-blue-600 dark:text-blue-400'
  return 'h-4 w-4 text-foreground'
}

const handleStatusChangeFromCard = async (status: Status) => {
  if (!canToggleStatus.value || status === props.task.status) return
  await taskStore.updateTask(props.task.id, { status }, user.value?.uid ?? null)
}

const handleStatusChangeFromInfo = async (status: Status) => {
  if (!canToggleStatus.value) return
  await taskStore.updateTask(props.task.id, { status }, user.value?.uid ?? null)
}

const taskMembersWithData = computed(() => {
  if (!props.workspaceMembers?.length) return []
  if (!props.task.assigneeIds?.length) return []
  return props.workspaceMembers.filter((m) =>
    props.task.assigneeIds?.includes(m.uid)
  )
})

const displayedMembers = computed(() => taskMembersWithData.value.slice(0, 3))
const extraMembersCount = computed(() =>
  Math.max(0, taskMembersWithData.value.length - 3)
)

const isOverdue = computed(() => {
  if (!props.task.dueDate || isCompleted.value) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(props.task.dueDate)
  due.setHours(0, 0, 0, 0)
  return due < now
})

const formatDueDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}
</script>

<template>
  <Card
    class="mb-3 hover:shadow-md transition-shadow cursor-pointer"
    @click="showInfoModal = true"
  >
    <CardContent class="px-4">
      <div class="flex items-start gap-2">
        <div @click.stop>
          <DropdownMenu v-if="canToggleStatus">
            <DropdownMenuTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 p-0"
                @click.stop
              >
                <span
                  v-if="task.status === 'completed'"
                  class="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500"
                >
                  <Check class="size-3 text-white" />
                </span>
                <LoaderCircle
                  v-else-if="task.status === 'inProgress'"
                  :class="getStatusIconClass(task.status)"
                />
                <CircleDashed v-else :class="getStatusIconClass(task.status)" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-[150px]">
              <DropdownMenuItem
                v-for="statusOption in availableStatusOptions"
                :key="statusOption.value"
                class="flex items-center gap-2"
                @click="handleStatusChangeFromCard(statusOption.value)"
              >
                <span
                  v-if="statusOption.value === 'completed'"
                  class="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500"
                >
                  <Check class="size-3 text-white" />
                </span>
                <LoaderCircle
                  v-else-if="statusOption.value === 'inProgress'"
                  :class="getStatusIconClass(statusOption.value)"
                />
                <CircleDashed
                  v-else
                  :class="getStatusIconClass(statusOption.value)"
                />
                <span>{{ statusOption.label }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div v-else class="flex h-6 w-6 items-center justify-center">
            <span
              v-if="task.status === 'completed'"
              class="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500"
            >
              <Check class="size-3 text-white" />
            </span>
            <LoaderCircle
              v-else-if="task.status === 'inProgress'"
              :class="getStatusIconClass(task.status)"
            />
            <CircleDashed v-else :class="getStatusIconClass(task.status)" />
          </div>
        </div>

        <div class="flex-1 overflow-hidden">
          <div class="mb-2 flex min-h-6 min-w-0 items-center gap-2">
            <span
              :class="`max-w-[570px] font-medium text-sm truncate ${isCompleted ? 'line-through text-muted-foreground opacity-70' : ''}`"
            >
              {{ task.title }}
            </span>
            <Badge :class="`priority-badge-${task.priority}`">
              {{ task.priority }}
            </Badge>
          </div>

          <div
            class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
          >
            <div v-if="projectName" class="min-w-0 sm:hidden">
              <span
                class="block max-w-[370px] truncate text-xs text-muted-foreground"
              >
                {{ projectName }}
              </span>
            </div>

            <div
              class="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-1 sm:justify-between"
            >
              <div class="flex min-w-0 items-center gap-2">
                <span
                  v-if="projectName"
                  class="hidden max-w-[370px] truncate text-xs text-muted-foreground sm:block"
                >
                  {{ projectName }}
                </span>
                <span v-if="projectName" class="hidden shrink-0 sm:block"
                  >•</span
                >
                <span
                  v-if="task.dueDate"
                  class="flex shrink-0 items-center gap-1"
                  :class="isOverdue ? 'text-red-500' : ''"
                >
                  <Clock class="h-3.5 w-3.5" />
                  {{ isOverdue ? 'Overdue' : 'Due' }}
                  {{ formatDueDate(new Date(task.dueDate)) }}
                </span>
                <span v-else class="shrink-0">No due date</span>
              </div>

              <div
                v-if="taskMembersWithData.length > 0"
                class="flex shrink-0 -space-x-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:ring-2"
              >
                <Avatar
                  v-for="member in displayedMembers"
                  :key="member.uid"
                  :uid="member.uid"
                  class="h-6 w-6"
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
            </div>
          </div>
        </div>

        <DropdownMenu v-if="hasAnyAction">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click.stop>
              <span class="sr-only">Open menu</span>
              <MoreHorizontal class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              v-if="canEdit"
              class="flex items-center gap-2"
              @click="isEditing = true"
            >
              <PenLine class="h-3 w-3" />
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuItem
              v-else
              disabled
              class="flex items-center gap-2 opacity-50 cursor-not-allowed"
            >
              <Lock class="h-3 w-3" />
              Edit Task
            </DropdownMenuItem>

            <DropdownMenuItem
              v-if="canDelete"
              class="flex items-center gap-2 text-destructive focus:text-destructive"
              @click="taskStore.deleteTask(task.id, user?.uid)"
            >
              <Trash2 class="h-3 w-3 text-destructive/50" />
              Delete Task
            </DropdownMenuItem>
            <DropdownMenuItem
              v-else
              disabled
              class="flex items-center gap-2 opacity-50 cursor-not-allowed text-destructive/50"
            >
              <Lock class="h-3 w-3 text-destructive/50" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardContent>
  </Card>

  <Teleport to="body">
    <div v-if="isTransitioning" class="fixed inset-0 z-50 bg-black/80" />
  </Teleport>

  <TaskForm
    :is-open="isEditing"
    :edit-task="task"
    :user-id="user?.uid"
    :workspace-id="workspaceId"
    :project-id="task.projectId"
    @close="isEditing = false"
  />

  <TaskInfos
    :is-open="showInfoModal"
    :task="task"
    :workspace-members="workspaceMembers"
    :assigned-member-ids="task.assigneeIds || []"
    :can-toggle-status="canToggleStatus"
    :can-edit="canEdit"
    :can-delete="canDelete"
    @close="showInfoModal = false"
    @edit="handleEditFromInfo"
    @delete="
      ((showInfoModal = false), taskStore.deleteTask(task.id, user?.uid))
    "
    @status-change="handleStatusChangeFromInfo"
  />
</template>
