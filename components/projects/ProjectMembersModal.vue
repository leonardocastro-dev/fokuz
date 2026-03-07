<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'vue-sonner'
import { useAuth } from '@/composables/useAuth'
import { useMembers } from '@/composables/useMembers'

const props = defineProps<{
  project: Project
  workspaceId: string
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  'members-updated': []
}>()

const { user } = useAuth()
const {
  membersForProjects,
  loadWorkspaceMembers,
  loadAllProjectAssignments,
  projectAssignmentsMap,
  invalidateAssignmentsCache,
  hasAccessProjectsPermission
} = useMembers()

const isSaving = ref(false)
const isLoading = ref(false)
const selectedMemberIds = ref<string[]>([])
const initialMemberIds = ref<string[]>([])

const getAuthToken = async (): Promise<string | null> => {
  if (!user.value) return null
  return await user.value.getIdToken()
}

watch(open, async (isOpen) => {
  if (isOpen) {
    await loadData()
  }
})

const loadData = async () => {
  isLoading.value = true
  try {
    await loadWorkspaceMembers(props.workspaceId)
    await loadAllProjectAssignments(props.workspaceId, [props.project.id], true)

    const assigned = projectAssignmentsMap.value[props.project.id] || []

    // Include access-projects members even without an existing assignment
    const accessProjectsIds = membersForProjects.value
      .filter((m) => hasAccessProjectsPermission(m))
      .map((m) => m.uid)
    const allSelectedIds = [...new Set([...assigned, ...accessProjectsIds])]

    selectedMemberIds.value = [...allSelectedIds]
    initialMemberIds.value = [...allSelectedIds]
  } catch (error) {
    console.error('Error loading members:', error)
    toast.error('Failed to load members', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isLoading.value = false
  }
}

const toggleMember = (memberId: string) => {
  const member = membersForProjects.value.find((m) => m.uid === memberId)
  if (member && hasAccessProjectsPermission(member)) return

  const index = selectedMemberIds.value.indexOf(memberId)
  if (index > -1) {
    selectedMemberIds.value.splice(index, 1)
  } else {
    selectedMemberIds.value.push(memberId)
  }
}

const hasChanges = computed(() => {
  if (selectedMemberIds.value.length !== initialMemberIds.value.length) {
    return true
  }
  return !selectedMemberIds.value.every((id) =>
    initialMemberIds.value.includes(id)
  )
})

const save = async () => {
  if (!hasChanges.value) {
    open.value = false
    return
  }

  isSaving.value = true

  try {
    const token = await getAuthToken()
    if (!token) throw new Error('Not authenticated')

    await $fetch<{ success: boolean }>(`/api/projects/${props.project.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: props.workspaceId,
        memberIds: selectedMemberIds.value
      }
    })

    invalidateAssignmentsCache()

    toast.success('Project members updated successfully', {
      style: { background: '#6ee7b7' },
      duration: 3000
    })
    emit('members-updated')
    open.value = false
  } catch (error: any) {
    console.error('Error saving members:', error)
    toast.error(error.data?.message || 'Failed to update members', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="sm:w-[420px]"
      :can-close="!isSaving"
      @interact-outside="
        (e) => {
          if (isSaving) e.preventDefault()
        }
      "
    >
      <DialogHeader class="pt-6 px-6 flex-shrink-0">
        <DialogTitle>Manage Members</DialogTitle>
        <DialogDescription>
          <span v-if="project.emoji">{{ project.emoji }}</span>
          {{ project.title }}
        </DialogDescription>
      </DialogHeader>

      <hr />

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <template v-if="isLoading">
          <div v-for="i in 3" :key="i" class="flex items-center space-x-3 py-2">
            <Skeleton class="h-4 w-4" />
            <Skeleton class="h-8 w-8 rounded-full" />
            <Skeleton class="h-4 w-32" />
          </div>
        </template>

        <template v-else-if="membersForProjects.length === 0">
          <p class="text-sm text-muted-foreground text-center py-4">
            No eligible members in this workspace
          </p>
        </template>

        <template v-else>
          <div class="space-y-1">
            <div
              v-for="member in membersForProjects"
              :key="member.uid"
              class="flex items-center space-x-3 py-2 px-2 rounded-md"
              :class="
                hasAccessProjectsPermission(member)
                  ? 'cursor-default'
                  : 'hover:bg-muted/50 cursor-pointer'
              "
              @click="
                !hasAccessProjectsPermission(member) && toggleMember(member.uid)
              "
            >
              <Checkbox
                :model-value="
                  hasAccessProjectsPermission(member) ||
                  selectedMemberIds.includes(member.uid)
                "
                :disabled="isSaving || hasAccessProjectsPermission(member)"
                @click.stop
                @update:model-value="
                  !hasAccessProjectsPermission(member) &&
                  toggleMember(member.uid)
                "
              />
              <Avatar :uid="member.uid" class="h-8 w-8 shrink-0">
                <AvatarImage
                  v-if="member.avatarUrl"
                  :src="member.avatarUrl"
                  :alt="member.username || ''"
                />
                <AvatarFallback class="text-xs">
                  {{ member.username?.charAt(0).toUpperCase() || '?' }}
                </AvatarFallback>
              </Avatar>
              <Label
                :class="
                  hasAccessProjectsPermission(member)
                    ? 'cursor-default'
                    : 'cursor-pointer'
                "
                class="flex-1 font-medium text-sm"
              >
                {{ member.username || member.email }}
              </Label>
              <span
                v-if="hasAccessProjectsPermission(member)"
                class="text-xs text-muted-foreground"
              >
                All projects
              </span>
            </div>
          </div>
        </template>
      </div>

      <hr />

      <DialogFooter class="pb-6 px-6 flex-shrink-0">
        <Button variant="outline" :disabled="isSaving" @click="open = false">
          Cancel
        </Button>
        <Button :disabled="isSaving || !hasChanges" @click="save">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
