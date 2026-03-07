<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Workspace } from '@/types/Workspace'

const props = defineProps<{
  isOpen: boolean
  editWorkspace?: Workspace
}>()

const emit = defineEmits<{
  close: []
}>()

const workspaceStore = useWorkspaceStore()
const router = useRouter()

const name = ref('')
const description = ref('')
const nameError = ref('')
const isSubmitting = ref(false)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      resetForm()
    }
  }
)

watch(
  () => props.editWorkspace,
  (newWorkspace) => {
    if (newWorkspace) {
      name.value = newWorkspace.name
      description.value = newWorkspace.description || ''
    }
  },
  { immediate: true }
)

const handleSubmit = async () => {
  if (!name.value.trim()) {
    nameError.value = 'Workspace name is required'
    return
  }

  isSubmitting.value = true

  try {
    if (props.editWorkspace) {
      // Edit existing workspace
      await workspaceStore.updateWorkspace(
        props.editWorkspace.id,
        name.value,
        description.value
      )
      resetForm()
      emit('close')
    } else {
      // Create new workspace
      const workspace = await workspaceStore.createWorkspace(
        name.value,
        description.value
      )
      if (workspace) {
        resetForm()
        emit('close')
        await router.push(`/${workspace.id}/tasks`)
      }
    }
  } catch (error) {
    console.error('Error saving workspace:', error)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  name.value = ''
  description.value = ''
  nameError.value = ''
  isSubmitting.value = false
}

const handleClose = () => {
  resetForm()
  emit('close')
}
</script>

<template>
  <Dialog
    :open="isOpen"
    @update:open="
      (open) => {
        if (!open) handleClose()
      }
    "
  >
    <DialogContent>
      <div class="grid gap-4 p-6">
        <DialogHeader>
          <DialogTitle>{{
            props.editWorkspace ? 'Edit Workspace' : 'Create Workspace'
          }}</DialogTitle>
        </DialogHeader>

        <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label for="name">Workspace Name *</Label>
          <Input
            id="name"
            v-model="name"
            placeholder="Enter workspace name"
            :class="nameError ? 'border-red-700' : ''"
            @input="
              () => {
                if (name.trim()) nameError = ''
              }
            "
          />
          <p v-if="nameError" class="text-xs text-red-700">
            {{ nameError }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="description">Description</Label>
          <Textarea
            id="description"
            v-model="description"
            placeholder="Describe your workspace..."
            rows="3"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            :disabled="isSubmitting"
            @click="handleClose"
          >
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting || !name.trim()">
            <svg
              v-if="isSubmitting"
              class="w-4 h-4 mr-2 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {{
              isSubmitting
                ? props.editWorkspace
                  ? 'Updating...'
                  : 'Creating...'
                : props.editWorkspace
                  ? 'Update Workspace'
                  : 'Create Workspace'
            }}
          </Button>
        </DialogFooter>
        </form>
      </div>
    </DialogContent>
  </Dialog>
</template>
