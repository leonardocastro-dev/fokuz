<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DateValue } from 'reka-ui'
import { CalendarDate } from '@internationalized/date'
import {
  SlidersHorizontal,
  ListTodo,
  LoaderCircle,
  CheckCircle2,
  CircleDashed,
  CalendarIcon,
  ChevronDown,
  Users,
  Check,
  Search
} from 'lucide-vue-next'
import Calendar from '@/components/ui/calendar/Calendar.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/composables/useAuth'
import { useMembers } from '@/composables/useMembers'

const taskStore = useTaskStore()
const { user } = useAuth()
const { members } = useMembers()

const sortedMembers = computed(() => {
  const uid = user.value?.uid
  return [...members.value].sort((a, b) => {
    if (uid && a.uid === uid) return -1
    if (uid && b.uid === uid) return 1
    return (a.username || '').localeCompare(b.username || '')
  })
})

const scopeLabel = computed(() => {
  if (taskStore.scopeFilter === 'all') return 'All'
  if (!taskStore.scopeUserId) return 'All'
  if (taskStore.scopeUserId === user.value?.uid) return 'Me'
  const member = members.value.find((m) => m.uid === taskStore.scopeUserId)
  return member?.username || 'Member'
})

const selectedMember = computed(() => {
  if (taskStore.scopeFilter === 'all' || !taskStore.scopeUserId) return null
  return members.value.find((m) => m.uid === taskStore.scopeUserId) || null
})

const selectMember = (memberId: string | null) => {
  if (memberId === null) {
    taskStore.setScopeFilter('all')
  } else {
    taskStore.setScopeFilter('assigneds', memberId)
  }
}

const statusItems = computed(() => [
  {
    value: 'all',
    label: 'All Tasks',
    icon: ListTodo,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    count: taskStore.totalTasks
  },
  {
    value: 'pending',
    label: 'Pending',
    icon: CircleDashed,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    count: taskStore.pendingTasks
  },
  {
    value: 'inProgress',
    label: 'In Progress',
    icon: LoaderCircle,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    count: taskStore.inProgressTasks
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    count: taskStore.completedTasks
  }
])

const dueDatePopoverOpen = ref(false)
const showingCalendar = ref(false)

const customDateValue = computed<DateValue | undefined>(() => {
  if (!taskStore.customDueDate) return undefined
  const d = new Date(taskStore.customDueDate)
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
})

const dueDateLabel = computed(() => {
  if (taskStore.dueDateFilter === 'custom' && taskStore.customDueDate) {
    const d = new Date(taskStore.customDueDate)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  const labels: Record<string, string> = {
    all: 'All Dates',
    overdue: 'Overdue',
    'on-time': 'On Time',
    'no-date': 'No Date'
  }
  return labels[taskStore.dueDateFilter] || 'All Dates'
})

const onDueDatePopoverChange = (open: boolean) => {
  dueDatePopoverOpen.value = open
  if (open) {
    showingCalendar.value = false
  } else if (showingCalendar.value && !taskStore.customDueDate) {
    taskStore.setDueDateFilter('all')
  }
}

const selectDueDateOption = (value: string) => {
  if (value === 'custom') {
    showingCalendar.value = true
    return
  }
  taskStore.setDueDateFilter(value)
  dueDatePopoverOpen.value = false
}

const handleCalendarSelect = (date: DateValue) => {
  const jsDate = new Date(date.year, date.month - 1, date.day)
  taskStore.setCustomDueDate(jsDate.toISOString())
  dueDatePopoverOpen.value = false
}

const activeFilterCount = computed(() => {
  let count = 0
  if (taskStore.priorityFilter !== 'all') count++
  if (taskStore.dueDateFilter !== 'all') count++
  return count
})
</script>

<template>
  <div class="space-y-4 mb-6">
    <div class="flex items-center gap-2">
      <div class="flex-1 relative">
        <Label for="search" class="sr-only">Search tasks</Label>
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        />
        <Input
          id="search"
          type="text"
          placeholder="Search tasks..."
          :model-value="taskStore.searchQuery"
          class="w-full pl-9 bg-muted border-transparent focus-visible:border-input"
          @update:model-value="
            (val) => taskStore.setSearchQuery(String(val || ''))
          "
        />
      </div>

      <DropdownMenu v-if="members.length > 0">
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="default" class="gap-2 shrink-0">
            <Avatar
              v-if="selectedMember"
              :key="selectedMember.uid"
              :uid="selectedMember.uid"
              class="h-5 w-5"
            >
              <AvatarImage
                v-if="selectedMember.avatarUrl"
                :src="selectedMember.avatarUrl"
                :alt="selectedMember.username || ''"
              />
              <AvatarFallback class="text-[10px]">
                {{ selectedMember.username?.charAt(0).toUpperCase() || '?' }}
              </AvatarFallback>
            </Avatar>
            <Users v-else class="text-muted-foreground" />
            <span>{{ scopeLabel }}</span>
            <ChevronDown class="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-52">
          <DropdownMenuLabel>Filter by member</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="flex items-center gap-2 cursor-pointer"
            @click="selectMember(null)"
          >
            <Users class="shrink-0" />
            <span class="flex-1">All</span>
            <Check
              v-if="taskStore.scopeFilter === 'all'"
              class="h-4 w-4 shrink-0"
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-for="member in sortedMembers"
            :key="member.uid"
            class="flex items-center gap-2 cursor-pointer"
            @click="selectMember(member.uid)"
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
            <span class="flex-1 truncate">
              {{ member.username || 'Unknown' }}
              <span
                v-if="user?.uid === member.uid"
                class="text-muted-foreground text-xs"
                >(you)</span
              >
            </span>
            <Check
              v-if="
                taskStore.scopeFilter === 'assigneds' &&
                taskStore.scopeUserId === member.uid
              "
              class="h-4 w-4 shrink-0"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger as-child>
          <Button variant="outline" size="default" class="gap-2 shrink-0">
            <SlidersHorizontal class="h-4 w-4" />
            <span>Filters</span>
            <Badge
              v-if="activeFilterCount > 0"
              variant="secondary"
              class="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {{ activeFilterCount }}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          class="max-h-[290px] overflow-auto w-72 space-y-4"
        >
          <div>
            <Label for="priority-filter" class="mb-1 block text-sm font-medium"
              >Priority</Label
            >
            <Select
              :model-value="taskStore.priorityFilter"
              @update:model-value="
                (val) => taskStore.setPriorityFilter(String(val || 'all'))
              "
            >
              <SelectTrigger id="priority-filter" class="w-full">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label class="mb-1 block text-sm font-medium">Due Date</Label>
            <Popover
              :open="dueDatePopoverOpen"
              @update:open="onDueDatePopoverChange"
            >
              <PopoverTrigger as-child>
                <button
                  class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <span class="flex items-center gap-2">
                    <CalendarIcon class="h-4 w-4 text-muted-foreground" />
                    {{ dueDateLabel }}
                  </span>
                  <ChevronDown class="h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" class="w-auto p-0" :side-offset="4">
                <div v-if="!showingCalendar" class="p-1 space-y-0.5">
                  <button
                    v-for="option in [
                      { value: 'all', label: 'All Dates' },
                      { value: 'overdue', label: 'Overdue' },
                      { value: 'on-time', label: 'On Time' },
                      { value: 'no-date', label: 'No Date' },
                      { value: 'custom', label: 'Custom' }
                    ]"
                    :key="option.value"
                    class="flex w-full items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    :class="
                      taskStore.dueDateFilter === option.value
                        ? 'bg-accent text-accent-foreground'
                        : ''
                    "
                    @click="selectDueDateOption(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
                <div v-if="showingCalendar">
                  <Calendar
                    :model-value="customDateValue"
                    @update:model-value="
                      (val: DateValue) => handleCalendarSelect(val)
                    "
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
      <template v-if="taskStore.isLoading">
        <Skeleton
          v-for="i in 4"
          :key="i"
          class="h-[62px] w-full rounded-lg"
        />
      </template>
      <template v-else>
        <button
          v-for="item in statusItems"
          :key="item.value"
          class="flex items-center gap-3 cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors"
          :class="
            taskStore.statusFilter === item.value
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background hover:bg-muted/50'
          "
          @click="taskStore.setStatusFilter(item.value)"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            :class="item.iconBg"
          >
            <component
              :is="item.icon"
              class="h-5 w-5"
              :class="item.iconColor"
            />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium leading-tight">{{ item.label }}</p>
            <p class="text-xs text-muted-foreground">
              {{ item.count }} {{ item.count === 1 ? 'tarefa' : 'tarefas' }}
            </p>
          </div>
        </button>
      </template>
    </div>
  </div>
</template>
