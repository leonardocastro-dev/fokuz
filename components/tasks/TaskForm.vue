<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DateValue } from '@internationalized/date'
import { getLocalTimeZone, parseDate } from '@internationalized/date'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Users, CalendarIcon, Search } from 'lucide-vue-next'
import { useMembers } from '@/composables/useMembers'

type Priority = 'normal' | 'important' | 'urgent'

const props = defineProps<{
  isOpen: boolean
  editTask?: Task
  userId?: string
  workspaceId?: string
  projectId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const {
  members,
  selectedMemberIds,
  isLoadingMembers,
  loadWorkspaceMembers,
  loadTaskAssignees
} = useMembers()

const title = ref(props.editTask?.title || '')
const description = ref(props.editTask?.description || '')
const priority = ref<Priority>(
  (props.editTask?.priority as Priority) || 'normal'
)
const dueDate = ref<DateValue | undefined>(undefined)
const selectedProjectId = ref(
  props.projectId || props.editTask?.projectId || ''
)
const assigneeSearch = ref('')
const titleError = ref('')
const projectError = ref('')

const formatDisplayDate = (date: DateValue) => {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(
    date.toDate(getLocalTimeZone())
  )
}

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (!isOpen) return
    assigneeSearch.value = ''

    if (!props.editTask) {
      selectedProjectId.value = props.projectId || ''
    }

    if (props.workspaceId) {
      await loadWorkspaceMembers(props.workspaceId)
      if (props.editTask) {
        await loadTaskAssignees(props.workspaceId, props.editTask.id)
        return
      }
      selectedMemberIds.value = []
    }
  }
)

watch(
  () => props.editTask,
  async (newTask) => {
    if (newTask) {
      title.value = newTask.title
      description.value = newTask.description || ''
      priority.value = newTask.priority as Priority

      if (newTask.dueDate) {
        const dateOnly = newTask.dueDate.split('T')[0]
        dueDate.value = parseDate(dateOnly)
      } else {
        dueDate.value = undefined
      }
      selectedProjectId.value = newTask.projectId || props.projectId || ''

      if (props.isOpen && props.workspaceId) {
        await loadTaskAssignees(props.workspaceId, newTask.id)
      }
    }
  },
  { immediate: true }
)

const TITLE_MAX_LENGTH = 100

const handleSubmit = () => {
  if (isSubmitDisabled.value) {
    if (!title.value.trim()) {
      titleError.value = 'Title is required'
    } else if (title.value.trim().length > TITLE_MAX_LENGTH) {
      titleError.value = `Title must not exceed ${TITLE_MAX_LENGTH} characters`
    }
    if (!hasValidProjectSelection.value) {
      projectError.value = 'Project is required'
    }
    return
  }

  const dueDateISO = dueDate.value
    ? dueDate.value.toDate(getLocalTimeZone()).toISOString()
    : undefined

  if (props.editTask) {
    taskStore.updateTask(
      props.editTask.id,
      {
        title: title.value,
        description: description.value,
        priority: priority.value,
        dueDate: dueDateISO
      },
      props.userId,
      selectedMemberIds.value
    )
  } else {
    taskStore.addTask(
      {
        projectId: selectedProjectId.value,
        title: title.value,
        description: description.value,
        priority: priority.value,
        status: 'pending',
        dueDate: dueDateISO
      },
      props.userId,
      props.workspaceId,
      selectedMemberIds.value
    )
  }

  resetForm()
  emit('close')
}

const resetForm = () => {
  title.value = ''
  description.value = ''
  priority.value = 'normal'
  dueDate.value = undefined
  selectedProjectId.value = props.projectId || ''
  titleError.value = ''
  projectError.value = ''
  selectedMemberIds.value = []
}

const availableProjects = computed(() => {
  if (!props.workspaceId) return []
  return projectStore.projects.filter(
    (p) => p.workspaceId === props.workspaceId
  )
})

const filteredMembers = computed(() => {
  const query = assigneeSearch.value.toLowerCase().trim()
  if (!query) return members.value

  return members.value.filter((member) => {
    const username = (member.username || '').toLowerCase()
    const email = (member.email || '').toLowerCase()
    return username.includes(query) || email.includes(query)
  })
})

const isProjectSelectionRequired = computed(
  () => !props.editTask && !props.projectId
)

const hasValidProjectSelection = computed(() => {
  const effectiveProjectId =
    selectedProjectId.value ||
    props.editTask?.projectId ||
    props.projectId ||
    ''

  if (!effectiveProjectId.trim()) return false

  if (!isProjectSelectionRequired.value) return true

  return availableProjects.value.some(
    (project) => project.id === effectiveProjectId
  )
})

const isSubmitDisabled = computed(() => {
  if (!title.value.trim()) return true
  if (title.value.trim().length > TITLE_MAX_LENGTH) return true
  return !hasValidProjectSelection.value
})

const handleClose = () => {
  resetForm()
  emit('close')
}

const getMemberInitial = (username?: string, email?: string) => {
  return (username || email || '?').charAt(0).toUpperCase()
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
      class="md:max-w-[480px] w-full p-0 flex flex-col overflow-hidden"
    >
      <SheetHeader>
        <SheetTitle class="text-2xl font-medium leading-tight">{{
          editTask ? 'Edit Task' : 'Add New Task'
        }}</SheetTitle>
        <SheetDescription class="sr-only">
          {{ editTask ? 'Edit task details' : 'Create a new task' }}
        </SheetDescription>
      </SheetHeader>
      <form class="space-y-4 px-5 pt-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label for="title" class="font-medium">Title *</Label>
          <Input
            id="title"
            v-model="title"
            placeholder="Task title"
            :maxlength="TITLE_MAX_LENGTH"
            :class="titleError ? 'border-red-700' : ''"
            @update:model-value="
              (val) => {
                if (String(val).trim()) titleError = ''
              }
            "
          />
          <div class="flex justify-between items-center">
            <p v-if="titleError" class="text-sm text-red-700">
              {{ titleError }}
            </p>
            <span class="text-xs text-muted-foreground ml-auto">
              {{ title.length }}/{{ TITLE_MAX_LENGTH }}
            </span>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="description" class="font-medium">
            Description (optional)
          </Label>
          <Textarea
            id="description"
            v-model="description"
            placeholder="Add details about your task"
            class="min-h-[100px] break-all resize-none whitespace-pre-wrap"
          />
        </div>

        <div class="space-y-2">
          <Label for="priority" class="font-medium">Priority *</Label>
          <RadioGroup
            id="priority"
            v-model="priority"
            class="flex flex-col sm:flex-row space-x-4"
          >
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="urgent" value="urgent" />
              <Label for="urgent" class="flex items-center cursor-pointer">
                <span class="h-3 w-3 rounded-full bg-red-700 mr-2" />
                <span>Urgent</span>
              </Label>
            </div>

            <div class="flex items-center space-x-2">
              <RadioGroupItem id="important" value="important" />
              <Label for="important" class="flex items-center cursor-pointer">
                <span class="h-3 w-3 rounded-full bg-yellow-600 mr-2" />
                <span>Important</span>
              </Label>
            </div>

            <div class="flex items-center space-x-2">
              <RadioGroupItem id="normal" value="normal" />
              <Label for="normal" class="flex items-center cursor-pointer">
                <span class="h-3 w-3 rounded-full bg-emerald-600 mr-2" />
                <span>Normal</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div class="space-y-2">
          <Label class="font-medium">Due Date (optional)</Label>
          <Popover>
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                class="w-full justify-start text-left font-normal"
              >
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{
                  dueDate
                    ? formatDisplayDate(dueDate as DateValue)
                    : 'Pick a date'
                }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <Calendar v-model="dueDate" layout="month-and-year" />
            </PopoverContent>
          </Popover>
        </div>

        <div v-if="!editTask && !projectId" class="space-y-2">
          <Label for="project" class="font-medium">Project *</Label>
          <Select
            v-model="selectedProjectId"
            @update:model-value="
              (value) => {
                if (String(value || '').trim()) projectError = ''
              }
            "
          >
            <SelectTrigger id="project">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-if="availableProjects.length === 0"
                value="__empty"
                disabled
              >
                No projects available
              </SelectItem>
              <SelectItem
                v-for="project in availableProjects"
                :key="project.id"
                :value="project.id"
              >
                {{ project.title }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="projectError" class="text-sm text-red-700">
            {{ projectError }}
          </p>
        </div>

        <!-- Assign Members Section -->
        <div v-if="workspaceId && userId" class="space-y-2">
          <Label class="flex items-center gap-2 font-medium">
            <Users class="h-4 w-4" />
            Assign Members (optional)
          </Label>
          <p class="text-sm text-muted-foreground">
            Select members to assign to this task.
          </p>

          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            />
            <Input
              v-model="assigneeSearch"
              type="text"
              placeholder="Search members..."
              class="h-9 pl-9"
            />
          </div>

          <div class="max-h-[180px] overflow-y-auto rounded-md border p-4">
            <div class="space-y-3">
              <template v-if="isLoadingMembers">
                <div
                  v-for="i in 3"
                  :key="i"
                  class="flex items-center space-x-2"
                >
                  <Skeleton class="h-4 w-4" />
                  <Skeleton class="h-4 w-32" />
                </div>
              </template>
              <template v-else>
                <div
                  v-for="member in filteredMembers"
                  :key="member.uid"
                  class="flex items-center space-x-2"
                >
                  <Checkbox
                    :id="`task-member-${member.uid}`"
                    :model-value="selectedMemberIds.includes(member.uid)"
                    @update:model-value="
                      (checked) => {
                        if (checked) {
                          selectedMemberIds.push(member.uid)
                        } else {
                          const index = selectedMemberIds.indexOf(member.uid)
                          if (index > -1) selectedMemberIds.splice(index, 1)
                        }
                      }
                    "
                  />
                  <Label
                    :for="`task-member-${member.uid}`"
                    class="cursor-pointer flex-1 font-normal min-w-0"
                  >
                    <span class="flex items-center gap-2 min-w-0">
                      <Avatar :uid="member.uid" class="h-6 w-6 shrink-0">
                        <AvatarImage
                          v-if="member.avatarUrl"
                          :src="member.avatarUrl"
                          :alt="member.username || member.email"
                        />
                        <AvatarFallback class="text-[10px]">
                          {{ getMemberInitial(member.username, member.email) }}
                        </AvatarFallback>
                      </Avatar>
                      <span class="min-w-0">
                        <span class="block text-sm truncate">
                          {{ member.username || member.email }}
                        </span>
                        <span
                          v-if="member.username && member.email"
                          class="block text-xs text-muted-foreground truncate"
                        >
                          {{ member.email }}
                        </span>
                      </span>
                    </span>
                  </Label>
                </div>

                <p
                  v-if="members.length === 0"
                  class="text-sm text-muted-foreground text-center py-4"
                >
                  No members in this workspace
                </p>
                <p
                  v-else-if="filteredMembers.length === 0"
                  class="text-sm text-muted-foreground text-center py-4"
                >
                  No members found
                </p>
              </template>
            </div>
          </div>
        </div>

        <SheetFooter class="p-0">
          <Button type="button" variant="outline" @click="handleClose">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitDisabled">
            {{ editTask ? 'Update Task' : 'Add Task' }}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
