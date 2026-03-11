<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Building2, Calendar, Users } from 'lucide-vue-next'
import type { Workspace } from '@/types/Workspace'

const props = defineProps<{
  isOpen: boolean
  workspace: Workspace | null | undefined
}>()

const emit = defineEmits<{
  close: []
}>()

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric'
  }).format(date)
}

const createdAtDate = computed(() => {
  if (!props.workspace?.createdAt) return null

  const createdAt = new Date(props.workspace.createdAt)
  if (Number.isNaN(createdAt.getTime())) return null

  return createdAt
})

const createdAtFallback = computed(() => {
  return props.workspace?.createdAt || '-'
})

const handleClose = () => {
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
    <DialogContent class="sm:max-w-[620px] p-0 overflow-hidden">
      <div class="grid gap-5 py-5">
        <DialogHeader class="px-5">
          <DialogTitle>Workspace Infos</DialogTitle>
          <DialogDescription>
            Workspace details and metadata
          </DialogDescription>
        </DialogHeader>

        <hr />

        <div
          class="px-5 grid grid-cols-1 gap-y-3 md:grid-cols-[auto_1fr] md:gap-x-8 md:gap-y-4 md:items-center overflow-hidden"
        >
          <span class="text-sm text-muted-foreground flex items-center gap-2">
            <Building2 class="h-4 w-4 text-muted-foreground/70" />
            Name
          </span>
          <span class="text-sm font-medium break-words">
            {{ workspace?.name || '-' }}
          </span>

          <span class="text-sm text-muted-foreground flex items-center gap-2">
            <Users class="h-4 w-4 text-muted-foreground/70" />
            Members
          </span>
          <span class="text-sm">
            {{ workspace?.members?.length || 0 }} members
          </span>

          <span class="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar class="h-4 w-4 text-muted-foreground/70" />
            Created
          </span>
          <span class="text-sm">
            <span class="font-medium">{{
              createdAtDate ? formatDate(createdAtDate) : createdAtFallback
            }}</span>
            <span v-if="createdAtDate" class="text-muted-foreground ml-1">{{
              formatTime(createdAtDate)
            }}</span>
          </span>
        </div>

        <div class="px-5">
          <div class="relative rounded-xl bg-muted/50 p-4">
            <p class="font-medium mb-2">Workspace Description</p>
            <p
              class="text-sm text-muted-foreground whitespace-pre-wrap break-all"
            >
              {{ workspace?.description || 'No description provided' }}
            </p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
