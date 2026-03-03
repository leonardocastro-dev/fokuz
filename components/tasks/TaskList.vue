<script setup lang="ts">
import { computed } from 'vue'
import TaskItem from './TaskItem.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import type { WorkspaceMember } from '@/composables/useMembers'

defineProps<{
  workspaceId?: string
  workspaceMembers?: WorkspaceMember[]
}>()

const taskStore = useTaskStore()
const filteredTasks = computed(() => {
  return taskStore.filteredTasks
})
</script>

<template>
  <div v-if="taskStore.isLoading" class="space-y-2">
    <Card
      v-for="i in 6"
      :key="`skeleton-${i}`"
      class="mb-3 hover:shadow-md transition-shadow"
    >
      <CardContent class="px-4">
        <div class="flex items-start gap-2">
          <Skeleton class="h-6 w-6 rounded-full" />
          <div class="flex-1 overflow-hidden">
            <div class="mb-1 flex min-h-6 items-center gap-2">
              <Skeleton class="h-5 w-full max-w-40" />
              <Skeleton class="h-5 min-w-16" />
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Skeleton class="h-4 w-16" />
                <Skeleton class="h-4 w-4 rounded-full" />
                <Skeleton class="h-4 w-24" />
              </div>
              <div class="flex -space-x-2">
                <Skeleton class="h-6 w-6 rounded-full" />
                <Skeleton class="h-6 w-6 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton class="h-6 w-6 rounded-md" />
        </div>
      </CardContent>
    </Card>
  </div>
  <Alert v-else-if="filteredTasks.length === 0">
    <AlertDescription>
      No tasks found. Try adjusting your filters or adding a new task.
    </AlertDescription>
  </Alert>
  <div v-else class="space-y-2">
    <TaskItem
      v-for="task in filteredTasks"
      :key="task.id"
      :task="task"
      :workspace-id="workspaceId"
      :workspace-members="workspaceMembers"
    />
  </div>
</template>
