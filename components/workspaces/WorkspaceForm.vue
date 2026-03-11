<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const NAME_MAX_LENGTH = 50
const NAME_MIN_LENGTH = 3
const DESCRIPTION_MAX_LENGTH = 200

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
const descriptionError = ref('')
const isSubmitting = ref(false)

const isSubmitDisabled = computed(() => {
  const trimmed = name.value.trim()
  if (!trimmed || trimmed.length < NAME_MIN_LENGTH) return true
  if (trimmed.length > NAME_MAX_LENGTH) return true
  if (description.value.length > DESCRIPTION_MAX_LENGTH) return true
  return false
})

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
  const trimmed = name.value.trim()
  if (!trimmed) {
    nameError.value = 'Workspace name is required'
    return
  }
  if (trimmed.length < NAME_MIN_LENGTH) {
    nameError.value = `Name must be at least ${NAME_MIN_LENGTH} characters`
    return
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    nameError.value = `Name must not exceed ${NAME_MAX_LENGTH} characters`
    return
  }
  if (description.value.length > DESCRIPTION_MAX_LENGTH) {
    descriptionError.value = `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`
    return
  }

  nameError.value = ''
  descriptionError.value = ''
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
  descriptionError.value = ''
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
              :maxlength="NAME_MAX_LENGTH"
              :class="nameError ? 'border-red-700' : ''"
              :disabled="isSubmitting"
              @update:model-value="
                (val) => {
                  if (String(val).trim()) nameError = ''
                }
              "
            />
            <div class="flex justify-between items-center">
              <p v-if="nameError" class="text-xs text-red-700">
                {{ nameError }}
              </p>
              <span class="text-xs text-muted-foreground ml-auto">
                {{ name.length }}/{{ NAME_MAX_LENGTH }}
              </span>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="description">Description (optional)</Label>
            <Textarea
              id="description"
              v-model="description"
              placeholder="Describe your workspace..."
              rows="3"
              :maxlength="DESCRIPTION_MAX_LENGTH"
              :class="descriptionError ? 'border-red-700' : ''"
              :disabled="isSubmitting"
              @update:model-value="
                () => {
                  if (description.length <= DESCRIPTION_MAX_LENGTH)
                    descriptionError = ''
                }
              "
            />
            <div class="flex justify-between items-center">
              <p v-if="descriptionError" class="text-xs text-red-700">
                {{ descriptionError }}
              </p>
              <span class="text-xs text-muted-foreground ml-auto">
                {{ description.length }}/{{ DESCRIPTION_MAX_LENGTH }}
              </span>
            </div>
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
            <Button type="submit" :disabled="isSubmitting || isSubmitDisabled">
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
