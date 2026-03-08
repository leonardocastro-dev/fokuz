<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspaces'
import { useAuth } from '@/composables/useAuth'
import { useMembers } from '@/composables/useMembers'
import MemberList from '@/components/members/MemberList.vue'

definePageMeta({
  layout: 'workspace'
})

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { user } = useAuth()
const { members, isLoadingMembers, loadWorkspaceMembers } = useMembers()

const workspaceId = computed(() => route.params.workspace as string)
const workspace = computed(() =>
  workspaceStore.workspaces.find((ws) => ws.id === workspaceId.value)
)

onMounted(async () => {
  if (!workspaceStore.loaded) {
    await workspaceStore.loadWorkspaces(user.value?.uid)
  }
  await loadWorkspaceMembers(workspaceId.value)
})

const handleMemberRemoved = async () => {
  await workspaceStore.loadWorkspaces(user.value?.uid)
  await loadWorkspaceMembers(workspaceId.value, true)
}

const handlePermissionsUpdated = async () => {
  await loadWorkspaceMembers(workspaceId.value, true)
}

const handleMemberRoleUpdated = async () => {
  await loadWorkspaceMembers(workspaceId.value, true)
}

const handleOwnershipTransferred = async () => {
  await workspaceStore.loadWorkspaces(user.value?.uid)
  await loadWorkspaceMembers(workspaceId.value, true)
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-primary mb-2">Members</h1>
      <p class="text-muted-foreground">
        Manage workspace members and invitations
      </p>
    </header>

    <MemberList
      v-if="workspace"
      :workspace="workspace"
      :members="members"
      :is-loading-members="isLoadingMembers"
      @member-removed="handleMemberRemoved"
      @permissions-updated="handlePermissionsUpdated"
      @member-role-updated="handleMemberRoleUpdated"
      @ownership-transferred="handleOwnershipTransferred"
    />
  </div>
</template>
