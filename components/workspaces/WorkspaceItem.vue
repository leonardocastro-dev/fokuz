<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-vue-next'
import WorkspaceForm from './WorkspaceForm.vue'
import type { Workspace } from '@/types/Workspace'
import { useAuth } from '@/composables/useAuth'
import { useWorkspaceStore } from '@/stores/workspaces'

const props = defineProps<{
  workspace: Workspace
}>()

const router = useRouter()
const isEditing = ref(false)
const workspaceStore = useWorkspaceStore()
const { user } = useAuth()

const goToWorkspace = () => {
  router.push(`/${props.workspace.id}/tasks`)
}

const deleteWorkspace = async () => {
  await workspaceStore.deleteWorkspace(props.workspace.id, user.value?.uid)
  // Optionally navigate away if current workspace is deleted
}
</script>

<template>
  <Card
    class="w-full max-w-full overflow-hidden bg-card border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer min-h-[250px] flex flex-col"
    @click="goToWorkspace"
  >
    <CardContent class="flex-1 flex p-0 flex-col min-w-0">
      <div class="flex items-start justify-between mb-4 flex-1 min-w-0 gap-2">
        <div class="flex-1 min-w-0">
          <h3
            class="text-lg font-semibold text-foreground mb-1 truncate max-w-full"
          >
            {{ workspace.name }}
          </h3>
          <p
            class="text-sm text-muted-foreground line-clamp-3 break-all overflow-hidden"
          >
            {{ workspace.description }}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0 shrink-0"
              @click.stop
            >
              <span class="sr-only">Open menu</span>
              <MoreHorizontal class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click.stop="isEditing = true">
              Edit Workspace
            </DropdownMenuItem>
            <DropdownMenuItem
              class="text-destructive focus:text-destructive"
              @click.stop="deleteWorkspace"
            >
              Delete Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        class="flex items-center justify-between text-sm text-muted-foreground mt-auto"
      >
        <span>{{ workspace.members.length }} members</span>
        <span>{{ new Date(workspace.createdAt).toLocaleDateString() }}</span>
      </div>
    </CardContent>
  </Card>

  <WorkspaceForm
    :is-open="isEditing"
    :edit-workspace="workspace"
    @close="isEditing = false"
  />
</template>
