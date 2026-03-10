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
import { Smile } from 'lucide-vue-next'
import data from 'emoji-mart-vue-fast/data/all.json'
import 'emoji-mart-vue-fast/css/emoji-mart.css'
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast/src'
import { useWorkspace } from '@/composables/useWorkspace'
import { showErrorToast } from '@/utils/toast'

const emojiIndex = new EmojiIndex(data)

const props = defineProps<{
  isOpen: boolean
  editProject?: Project
  userId?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { workspaceId } = useWorkspace()

const projectStore = useProjectStore()

const title = ref(props.editProject?.title || '')
const description = ref(props.editProject?.description || '')
const emoji = ref(props.editProject?.emoji || '')
const showEmojiPicker = ref(false)
const TITLE_MAX_LENGTH = 100
const TITLE_MIN_LENGTH = 3
const DESCRIPTION_MAX_LENGTH = 500

const titleError = ref('')
const descriptionError = ref('')
const isSaving = ref(false)

watch(
  () => props.editProject,
  (newProject) => {
    if (newProject) {
      title.value = newProject.title
      description.value = newProject.description || ''
      emoji.value = newProject.emoji || ''
    }
  },
  { immediate: true }
)

const onSelectEmoji = (emojiData: any) => {
  emoji.value = emojiData.native
  showEmojiPicker.value = false
}

const clearEmoji = () => {
  emoji.value = ''
  showEmojiPicker.value = false
}

const isSubmitDisabled = computed(() => {
  const trimmed = title.value.trim()
  if (!trimmed || trimmed.length < TITLE_MIN_LENGTH) return true
  if (trimmed.length > TITLE_MAX_LENGTH) return true
  if (description.value.length > DESCRIPTION_MAX_LENGTH) return true
  return false
})

const handleSubmit = async () => {
  const trimmed = title.value.trim()
  if (!trimmed) {
    titleError.value = 'Title is required'
    return
  }
  if (trimmed.length < TITLE_MIN_LENGTH) {
    titleError.value = `Title must be at least ${TITLE_MIN_LENGTH} characters`
    return
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    titleError.value = `Title must be less than ${TITLE_MAX_LENGTH} characters`
    return
  }
  if (description.value.length > DESCRIPTION_MAX_LENGTH) {
    descriptionError.value = `Description must be less than ${DESCRIPTION_MAX_LENGTH} characters`
    return
  }

  titleError.value = ''
  descriptionError.value = ''
  isSaving.value = true

  try {
    const now = new Date().toISOString()

    if (props.editProject) {
      await projectStore.updateProject(
        props.editProject.id,
        {
          title: title.value,
          description: description.value,
          emoji: emoji.value || undefined,
          updatedAt: now
        },
        props.userId
      )
    } else {
      await projectStore.addProject(
        {
          id: crypto.randomUUID(),
          title: title.value,
          description: description.value,
          emoji: emoji.value || undefined,
          createdAt: now,
          updatedAt: now,
          members: [],
          workspaceId: workspaceId.value || undefined
        },
        props.userId,
        workspaceId.value || undefined
      )
    }

    resetForm()
    emit('close')
  } catch {
    showErrorToast('Failed to save project. Please try again.')
  } finally {
    isSaving.value = false
  }
}

const resetForm = () => {
  title.value = ''
  description.value = ''
  emoji.value = ''
  showEmojiPicker.value = false
  titleError.value = ''
  descriptionError.value = ''
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
          <div class="flex items-center gap-4">
            <div class="relative">
              <Button
                type="button"
                variant="outline"
                class="w-11 h-11 text-3xl rounded-full"
                @click="showEmojiPicker = !showEmojiPicker"
              >
                <Smile v-if="!emoji" :size="20" />
                <span v-else class="text-xl">{{ emoji }}</span>
              </Button>

              <div
                v-if="showEmojiPicker"
                class="absolute z-50 mt-2 bg-white rounded-lg shadow-xl"
              >
                <Picker
                  :data="emojiIndex"
                  set="twitter"
                  @select="onSelectEmoji"
                >
                  <template #searchTemplate="{ searchValue, onSearch }">
                    <div class="flex items-center gap-2 p-2 border-b">
                      <input
                        class="flex-1 px-3 py-1 border rounded-md"
                        type="text"
                        :value="searchValue"
                        placeholder="Search emoji..."
                        @input="
                          (e) =>
                            onSearch(
                              (e.target as HTMLInputElement)?.value ?? ''
                            )
                        "
                      />

                      <button
                        v-if="emoji"
                        class="px-2 py-1 h-full text-sm bg-red-100 text-red-600 rounded-md"
                        @click="clearEmoji"
                      >
                        Clear
                      </button>
                    </div>
                  </template>
                </Picker>
              </div>
            </div>

            <DialogTitle>
              {{ editProject ? 'Edit Project' : 'Create New Project' }}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <Label for="title">Title *</Label>
            <Input
              id="title"
              v-model="title"
              placeholder="Project title"
              :maxlength="TITLE_MAX_LENGTH"
              :class="titleError ? 'border-red-700' : ''"
              :disabled="isSaving"
              @update:model-value="
                (val) => {
                  if (String(val).trim()) titleError = ''
                }
              "
            />
            <div class="flex justify-between items-center">
              <p v-if="titleError" class="text-xs text-red-700">
                {{ titleError }}
              </p>
              <span class="text-xs text-muted-foreground ml-auto">
                {{ title.length }}/{{ TITLE_MAX_LENGTH }}
              </span>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="description">Description (optional)</Label>
            <Textarea
              id="description"
              v-model="description"
              placeholder="Add a description..."
              rows="4"
              :maxlength="DESCRIPTION_MAX_LENGTH"
              :class="descriptionError ? 'border-red-700' : ''"
              :disabled="isSaving"
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
              :disabled="isSaving"
              @click="handleClose"
            >
              Cancel
            </Button>
            <Button type="submit" :disabled="isSaving || isSubmitDisabled">
              {{
                isSaving
                  ? 'Saving...'
                  : editProject
                    ? 'Update Project'
                    : 'Create Project'
              }}
            </Button>
          </DialogFooter>
        </form>
      </div>
    </DialogContent>
  </Dialog>
</template>
