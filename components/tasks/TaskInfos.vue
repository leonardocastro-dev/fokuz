<script setup lang="ts">
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Flag,
  Star,
  StarHalf,
  Check,
  Calendar,
  Clock,
  LoaderCircle,
  Users,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  MoreHorizontal,
  PenLine,
  Trash2,
  Lock,
  Search
} from 'lucide-vue-next'
import type { WorkspaceMember } from '@/composables/useMembers'

const props = defineProps<{
  isOpen: boolean
  task: Task
  workspaceMembers?: WorkspaceMember[]
  assignedMemberIds?: string[]
  canToggleStatus?: boolean
  canEdit?: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  close: []
  edit: []
  delete: []
  statusChange: [status: Status]
}>()

const hasAnyAction = computed(() => props.canEdit || props.canDelete)

const taskMembersWithData = computed(() => {
  if (!props.workspaceMembers || props.workspaceMembers.length === 0) {
    return []
  }
  if (!props.assignedMemberIds || props.assignedMemberIds.length === 0) {
    return []
  }
  return props.workspaceMembers.filter((member) => {
    return props.assignedMemberIds?.includes(member.uid)
  })
})

const assigneeSearch = ref('')

const filteredTaskMembers = computed(() => {
  const query = assigneeSearch.value.toLowerCase().trim()
  if (!query) return taskMembersWithData.value
  return taskMembersWithData.value.filter((m) =>
    (m.username || '').toLowerCase().includes(query)
  )
})

const firstMember = computed(() => taskMembersWithData.value[0] || null)
const otherMembers = computed(() => taskMembersWithData.value.slice(1))
const hasMultipleMembers = computed(() => taskMembersWithData.value.length > 1)

const statusOptions: Array<{ value: Status; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
]

const statusLabelMap: Record<Status, string> = {
  pending: 'Pending',
  inProgress: 'In Progress',
  completed: 'Completed'
}

const isCompleted = computed(() => props.task.status === 'completed')

const getStatusLabel = (status: Status): string => statusLabelMap[status]

const getStatusIcon = (status: Status) => {
  if (status === 'completed') return Check
  if (status === 'inProgress') return LoaderCircle
  return CircleDashed
}

const getStatusBadgeClass = (status: Status): string => {
  if (status === 'completed') {
    return 'rounded-2xl bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
  }
  if (status === 'inProgress') {
    return 'rounded-2xl bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
  }
  return 'rounded-2xl bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
}

const getStatusTextClass = (status: Status): string => {
  if (status === 'completed') return 'text-emerald-600 dark:text-emerald-400'
  if (status === 'inProgress') return 'text-blue-600 dark:text-blue-400'
  return 'text-amber-600 dark:text-amber-400'
}

const handleStatusChange = (value: string) => {
  if (!props.canToggleStatus) return
  if (value !== 'pending' && value !== 'inProgress' && value !== 'completed') {
    return
  }
  if (value === props.task.status) return
  emit('statusChange', value)
}

const isOverdue = computed(() => {
  if (!props.task.dueDate || isCompleted.value) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(props.task.dueDate)
  due.setHours(0, 0, 0, 0)
  return due < now
})

const getPriorityIcon = () => {
  switch (props.task.priority) {
    case 'urgent':
      return Flag
    case 'important':
      return Star
    default:
      return StarHalf
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric'
  }).format(date)
}

const descriptionExpanded = ref(false)
const descriptionRef = ref<HTMLElement | null>(null)
const needsExpand = ref(false)

const checkOverflow = () => {
  nextTick(() => {
    if (descriptionRef.value) {
      needsExpand.value = descriptionRef.value.scrollHeight > 100
    }
  })
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      descriptionExpanded.value = false
      checkOverflow()
    }
  }
)

watch(
  () => props.task.description,
  (desc) => {
    needsExpand.value = !!desc
    checkOverflow()
  }
)

const toggleDescription = () => {
  descriptionExpanded.value = !descriptionExpanded.value
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Sheet
    :open="isOpen"
    @update:open="
      (open) => {
        if (!open) handleClose()
      }
    "
  >
    <SheetContent
      side="right"
      class="md:max-w-[560px] w-full p-0 flex flex-col overflow-hidden"
    >
      <template v-if="hasAnyAction" #header-actions>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              class="opacity-70 transition-opacity hover:opacity-100 outline-none"
            >
              <MoreHorizontal class="md:size-5 size-6 cursor-pointer" />
              <span class="sr-only">Actions</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              v-if="canEdit"
              class="flex items-center gap-2"
              @click="emit('edit')"
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
              @click="emit('delete')"
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
      </template>

      <!-- Title -->
      <SheetHeader>
        <SheetTitle
          class="md:text-2xl text-lg font-medium leading-tight break-words"
        >
          {{ task.title }}
        </SheetTitle>
        <SheetDescription class="sr-only">
          Task details for {{ task.title }}
        </SheetDescription>
      </SheetHeader>

      <!-- Metadata rows -->
      <div
        class="p-5 grid grid-cols-1 gap-y-3 md:grid-cols-[auto_1fr] md:gap-x-8 md:gap-y-4 md:items-center overflow-hidden"
      >
        <!-- Created -->
        <span class="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar class="h-4 w-4 text-muted-foreground/70" />
          Created
        </span>
        <span class="text-sm">
          <span class="font-medium">{{
            formatDate(new Date(task.createdAt || Date.now()))
          }}</span>
          <span class="text-muted-foreground ml-1">{{
            formatTime(new Date(task.createdAt || Date.now()))
          }}</span>
        </span>
        <!-- Status -->
        <span class="text-sm text-muted-foreground flex items-center gap-2">
          <CircleDashed class="h-4 w-4 text-muted-foreground/70" />
          Status
        </span>
        <div>
          <DropdownMenu v-if="props.canToggleStatus">
            <DropdownMenuTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="w-[140px] justify-between p-1 h-auto"
              >
                <Badge
                  variant="outline"
                  :class="getStatusBadgeClass(task.status)"
                >
                  <span class="flex items-center gap-1.5">
                    <component
                      :is="getStatusIcon(task.status)"
                      :class="['h-3.5 w-3.5', getStatusTextClass(task.status)]"
                    />
                    {{ getStatusLabel(task.status) }}
                  </span>
                </Badge>
                <ChevronDown
                  class="h-3.5 w-3.5 text-muted-foreground opacity-80"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-[140px]">
              <DropdownMenuItem
                v-for="statusOption in statusOptions.filter(
                  (option) => option.value !== task.status
                )"
                :key="statusOption.value"
                class="p-1"
                @click="handleStatusChange(statusOption.value)"
              >
                <Badge
                  variant="outline"
                  :class="`justify-between ${getStatusBadgeClass(statusOption.value)}`"
                >
                  <span class="flex items-center gap-1.5">
                    <component
                      :is="getStatusIcon(statusOption.value)"
                      :class="[
                        'h-3.5 w-3.5',
                        getStatusTextClass(statusOption.value)
                      ]"
                    />
                    {{ statusOption.label }}
                  </span>
                </Badge>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Badge
            v-else
            variant="outline"
            :class="getStatusBadgeClass(task.status)"
          >
            <component
              :is="getStatusIcon(task.status)"
              :class="['h-3 w-3 mr-1', getStatusTextClass(task.status)]"
            />
            {{ getStatusLabel(task.status) }}
          </Badge>
        </div>

        <!-- Priority -->
        <span class="text-sm text-muted-foreground flex items-center gap-2">
          <component
            :is="getPriorityIcon()"
            class="h-4 w-4 text-muted-foreground/70"
          />
          Priority
        </span>
        <div>
          <Badge :class="`priority-badge-${task.priority}`">
            {{ task.priority }}
          </Badge>
        </div>

        <!-- Due Date -->
        <span
          class="text-sm flex items-center gap-2"
          :class="isOverdue ? 'text-red-500' : 'text-muted-foreground'"
        >
          <Clock
            class="h-4 w-4"
            :class="isOverdue ? 'text-red-500' : 'text-muted-foreground/70'"
          />
          Due Date
        </span>
        <span
          v-if="task.dueDate"
          class="text-sm font-medium"
          :class="isOverdue ? 'text-red-500' : ''"
        >
          {{ isOverdue ? 'Overdue — ' : ''
          }}{{ formatDate(new Date(task.dueDate)) }}
        </span>
        <span v-else class="text-sm text-muted-foreground italic">
          No due date
        </span>

        <!-- Assignees -->
        <span class="text-sm text-muted-foreground flex items-center gap-2">
          <Users class="h-4 w-4 text-muted-foreground/70" />
          Assignees
        </span>
        <div
          v-if="firstMember && !hasMultipleMembers"
          class="flex items-center gap-2"
        >
          <Avatar :uid="firstMember.uid" class="h-6 w-6 shrink-0">
            <AvatarImage
              v-if="firstMember.avatarUrl"
              :src="firstMember.avatarUrl"
              :alt="firstMember.username || ''"
            />
            <AvatarFallback class="text-[10px]">
              {{ firstMember.username?.charAt(0).toUpperCase() || '?' }}
            </AvatarFallback>
          </Avatar>
          <span class="text-sm">{{
            firstMember.username || firstMember.email
          }}</span>
        </div>
        <div v-else-if="firstMember">
          <DropdownMenu
            @update:open="
              (open: boolean) => {
                if (!open) assigneeSearch = ''
              }
            "
          >
            <DropdownMenuTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="max-w-full hover:bg-muted/80 cursor-pointer"
              >
                <Avatar :uid="firstMember.uid" class="h-5 w-5 shrink-0">
                  <AvatarImage
                    v-if="firstMember.avatarUrl"
                    :src="firstMember.avatarUrl"
                    :alt="firstMember.username || ''"
                  />
                  <AvatarFallback class="text-[10px]">
                    {{ firstMember.username?.charAt(0).toUpperCase() || '?' }}
                  </AvatarFallback>
                </Avatar>
                <span class="text-sm truncate">{{
                  firstMember.username || firstMember.email
                }}</span>
                <span class="text-xs text-muted-foreground"
                  >+{{ otherMembers.length }}</span
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
                    v-model="assigneeSearch"
                    type="text"
                    placeholder="Search..."
                    class="h-8 pl-7 text-sm"
                    @keydown.stop
                  />
                </div>
              </div>
              <div class="max-h-48 overflow-y-auto overflow-x-hidden">
                <DropdownMenuItem
                  v-for="member in filteredTaskMembers"
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
                    member.username || member.email
                  }}</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <span v-else class="text-sm text-muted-foreground italic">
          Unassigned
        </span>
      </div>

      <!-- Description -->
      <div class="px-5">
        <div
          v-if="task.description"
          class="relative rounded-xl bg-muted/50 p-4"
        >
          <p class="font-medium mb-2">Task Description</p>
          <div
            ref="descriptionRef"
            class="text-sm text-muted-foreground overflow-hidden transition-all duration-300 break-all whitespace-pre-wrap"
            :style="{ maxHeight: descriptionExpanded ? 'none' : '100px' }"
          >
            {{ task.description }}
          </div>
          <div
            v-if="needsExpand && !descriptionExpanded"
            class="pointer-events-none absolute bottom-0 left-0 right-0 h-20 rounded-b-xl"
            style="
              background: linear-gradient(
                to top,
                color-mix(in oklab, var(--muted) 50%, var(--background)) 0%,
                transparent 100%
              );
            "
          />
        </div>
        <div
          v-if="task.description && needsExpand"
          class="flex items-center justify-center gap-1 text-xs text-muted-foreground pt-2 cursor-pointer"
          @click="toggleDescription"
        >
          <ChevronDown v-if="!descriptionExpanded" class="h-3 w-3" />
          <ChevronUp v-else class="h-3 w-3" />
          {{ descriptionExpanded ? 'Recolher' : 'Expandir' }}
        </div>
        <p
          v-if="!task.description"
          class="text-sm text-muted-foreground italic"
        >
          No description provided
        </p>
      </div>
    </SheetContent>
  </Sheet>
</template>
