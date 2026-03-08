<script setup lang="ts">
import { computed } from 'vue'
import ProjectItem from './ProjectItem.vue'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps<{
  projects: Project[]
  workspaceMembers: WorkspaceMember[]
  isLoading: boolean
}>()

// Sort projects by updatedAt
const sortedProjects = computed(() => {
  return [...props.projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
})

const emit = defineEmits<{
  edit: [project: Project]
  'members-updated': []
}>()
</script>

<template>
  <div>
    <div
      v-if="isLoading"
      class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
    >
      <Skeleton class="aspect-[1.55] w-full rounded-xl" />
      <Skeleton class="aspect-[1.55] w-full rounded-xl" />
      <Skeleton class="aspect-[1.55] w-full rounded-xl" />
      <Skeleton class="aspect-[1.55] w-full rounded-xl" />
      <Skeleton class="aspect-[1.55] w-full rounded-xl" />
      <Skeleton class="aspect-[1.55] w-full rounded-xl" />
    </div>

    <div v-else-if="projects.length === 0" class="text-center py-12">
      <p class="text-muted-foreground text-lg">No projects yet</p>
      <p class="text-sm text-muted-foreground mt-2">
        Create your first project to get started
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
    >
      <ProjectItem
        v-for="project in sortedProjects"
        :key="project.id"
        :project="project"
        :workspace-members="workspaceMembers"
        @edit="emit('edit', $event)"
        @members-updated="emit('members-updated')"
      />
    </div>
  </div>
</template>
