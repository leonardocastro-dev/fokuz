<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useWorkspaceStore } from '@/stores/workspaces'
import { useProjectStore } from '@/stores/projects'

definePageMeta({
  layout: 'workspace'
})

const route = useRoute()
const { user, loading } = useAuth()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const workspaceExists = ref(true)

const workspaceSlug = route.params.workspace as string

if (!/^.+-\d+$/.test(workspaceSlug)) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Workspace not found'
  })
}

const initWorkspace = async () => {
  await workspaceStore.loadWorkspaces(user.value?.uid || null)

  const workspace = workspaceStore.workspaces.find(
    (w) => w.id === workspaceSlug
  )
  if (!workspace) {
    workspaceExists.value = false
    throw createError({
      statusCode: 404,
      statusMessage: 'Workspace not found'
    })
  }
  workspaceStore.setCurrentWorkspace(workspace)
  projectStore.loadProjectsForWorkspace(workspaceSlug, user.value?.uid)
}

watch(
  loading,
  (isLoading) => {
    if (!isLoading) {
      initWorkspace()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="loading" class="min-h-screen flex items-center justify-center">
    <LoadingSpinner />
  </div>

  <NuxtPage v-else-if="workspaceExists" />
</template>
