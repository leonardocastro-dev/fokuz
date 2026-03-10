<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ProjectList from '@/components/projects/ProjectList.vue'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import { useAuth } from '@/composables/useAuth'
import { useWorkspace } from '@/composables/useWorkspace'
import { useMembers } from '@/composables/useMembers'

const { user } = useAuth()
const { workspaceId } = useWorkspace()
const projectStore = useProjectStore()
const {
  members,
  loadWorkspaceMembers,
  loadAllProjectAssignments
} = useMembers()

const isAddingProject = ref(false)
const editingProject = ref<Project | undefined>()
const isReloading = ref(false)
const isInitialLoading = ref(
  projectStore.loadedWorkspaceId !== workspaceId.value
)

const visibleProjects = computed(() => projectStore.visibleProjects)

const loadAssignments = async () => {
  if (workspaceId.value && projectStore.projects.length > 0) {
    const projectIds = projectStore.projects.map((p) => p.id)
    await loadAllProjectAssignments(workspaceId.value, projectIds)
  }
}

const handleEdit = (project: Project) => {
  editingProject.value = project
}

const closeForm = () => {
  isAddingProject.value = false
  editingProject.value = undefined
}

onMounted(async () => {
  if (workspaceId.value) {
    try {
      await projectStore.loadProjectsForWorkspace(
        workspaceId.value,
        user.value?.uid
      )
      if (user.value?.uid) {
        await loadWorkspaceMembers(workspaceId.value)
        await loadAssignments()
      }
    } finally {
      isInitialLoading.value = false
    }
  } else {
    isInitialLoading.value = false
  }
})

watch(
  () => projectStore.projects,
  () => {
    if (user.value?.uid) loadAssignments()
  },
  { deep: true }
)

const handleReload = async () => {
  if (!workspaceId.value) return
  isReloading.value = true
  try {
    await projectStore.reloadProjects(workspaceId.value, user.value?.uid)
    if (user.value?.uid) {
      await loadAssignments()
    }
  } finally {
    isReloading.value = false
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-primary mb-2">Projects</h1>
      <p class="text-muted-foreground">Manage your projects and tasks</p>
    </header>

    <div
      class="flex sm:justify-between flex-col sm:flex-row sm:items-center justify-center mb-6"
    >
      <div>
        <h2 class="text-xl font-semibold">Your Projects</h2>
        <p class="text-sm text-muted-foreground mt-1">
          {{ visibleProjects.length }}
          {{ visibleProjects.length === 1 ? 'project' : 'projects' }}
        </p>
      </div>
      <div
        class="flex sm:flex-row items-center mt-3 sm:mt-0 flex-row-reverse justify-end gap-2"
      >
        <Button
          variant="ghost"
          size="sm"
          :disabled="projectStore.isLoading || isReloading"
          @click="handleReload"
        >
          <RefreshCw
            class="h-4 w-4 mr-2"
            :class="{ 'animate-spin': isReloading }"
          />
          Sync
        </Button>
        <Button
          v-if="projectStore.canCreateProjects"
          class="flex items-center gap-1"
          @click="isAddingProject = true"
        >
          <Plus class="h-5 w-5" />
          <span>New Project</span>
        </Button>
      </div>
    </div>

    <ProjectList
      :projects="visibleProjects"
      :workspace-members="members"
      :is-loading="isInitialLoading"
      @edit="handleEdit"
    />

    <ProjectForm
      :is-open="isAddingProject || !!editingProject"
      :edit-project="editingProject"
      :workspace-id="workspaceId || undefined"
      :user-id="user?.uid"
      @close="closeForm"
    />
  </div>
</template>
