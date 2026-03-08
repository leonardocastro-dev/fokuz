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
import {
  NestedCheckboxes,
  type NestedItem
} from '@/components/ui/nested-checkboxes'
import { toast } from 'vue-sonner'
import { useAuth } from '@/composables/useAuth'

interface Member {
  uid: string
  email: string
  username: string
  avatarUrl: string | null
  permissions?: Record<string, boolean> | null
  joinedAt?: any
}

const props = defineProps<{
  member: Member
  workspaceId: string
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  'permissions-updated': []
}>()

const { user } = useAuth()
const isSaving = ref(false)

const permissionsState = ref<Record<string, boolean>>({})
const initialPermissionsState = ref<Record<string, boolean>>({})

const getAuthToken = async (): Promise<string | null> => {
  if (!user.value) return null
  return await user.value.getIdToken()
}

watch(open, async (isOpen) => {
  if (isOpen) {
    initializePermissions()
  }
})

const initializePermissions = () => {
  const memberPermissions = props.member.permissions || {}

  const state: Record<string, boolean> = {}

  // Initialize all nested items from saved permissions
  const initFromItems = (items: NestedItem[], parentIsChecked = false) => {
    for (const item of items) {
      // Item is checked if: saved in DB, OR parent is checked (inherited)
      const isChecked = memberPermissions[item.id] === true || parentIsChecked
      state[item.id] = isChecked

      if (item.children) {
        initFromItems(item.children, isChecked)
      }
    }
  }

  initFromItems(nestedItems.value)
  permissionsState.value = state
  initialPermissionsState.value = { ...state }
}

const nestedItems = computed<NestedItem[]>(() => {
  return [
    {
      id: 'access-projects',
      name: 'Access projects'
    },
    {
      id: 'manage-projects',
      name: 'Manage projects',
      children: [
        {
          id: 'create-projects',
          name: 'Create projects'
        },
        {
          id: 'delete-projects',
          name: 'Delete projects'
        },
        {
          id: 'edit-projects',
          name: 'Edit projects'
        }
      ]
    },
    {
      id: 'manage-members',
      name: 'Manage members',
      children: [
        {
          id: 'add-members',
          name: 'Add members'
        },
        {
          id: 'remove-members',
          name: 'Remove members'
        },
        {
          id: 'assign-project',
          name: 'Assign to project'
        }
      ]
    }
  ]
})

// Helper to get all child IDs from a nested item
const getAllChildIds = (item: NestedItem): string[] => {
  if (!item.children) return []
  const ids: string[] = []
  for (const child of item.children) {
    ids.push(child.id)
    ids.push(...getAllChildIds(child))
  }
  return ids
}

// Computed: get selected permissions as array with optimization
const selectedPermissions = computed(() => {
  const selectedIds = Object.entries(permissionsState.value)
    .filter(([_, isChecked]) => isChecked)
    .map(([id]) => id)

  let optimizedIds = [...selectedIds]

  // For each parent item in nestedItems, check if all children are selected
  const checkAndOptimizeParent = (item: NestedItem) => {
    if (!item.children || item.children.length === 0) return

    const childIds = getAllChildIds(item)
    const allChildrenSelected =
      childIds.length > 0 && childIds.every((id) => optimizedIds.includes(id))

    if (allChildrenSelected && !optimizedIds.includes(item.id)) {
      // Remove all child IDs and add parent ID
      optimizedIds = optimizedIds
        .filter((id) => !childIds.includes(id))
        .concat(item.id)
    }

    // If parent is selected, remove individual child IDs
    if (optimizedIds.includes(item.id)) {
      optimizedIds = optimizedIds.filter((id) => !childIds.includes(id))
    }

    // Recursively check children
    if (item.children) {
      for (const child of item.children) {
        checkAndOptimizeParent(child)
      }
    }
  }

  // Apply optimization for all items
  for (const item of nestedItems.value) {
    checkAndOptimizeParent(item)
  }

  return optimizedIds
})

const hasChanges = computed(() => {
  const current = permissionsState.value
  const initial = initialPermissionsState.value

  for (const key of Object.keys(current)) {
    if (current[key] !== initial[key]) return true
  }
  return false
})

const savePermissions = async () => {
  isSaving.value = true

  try {
    const token = await getAuthToken()
    if (!token) throw new Error('Not authenticated')

    // Build permissions object from optimized selected permissions
    const permissionsData: Record<string, boolean> = {}
    for (const id of selectedPermissions.value) {
      if (id === 'owner' || id === 'admin') continue
      permissionsData[id] = true
    }

    const response = await $fetch<{ success: boolean }>(
      `/api/members/${props.member.uid}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          workspaceId: props.workspaceId,
          permissions: permissionsData
        }
      }
    )

    if (response.success) {
      toast.success('Permissions updated successfully', {
        style: { background: '#6ee7b7' },
        duration: 3000
      })
      emit('permissions-updated')
      open.value = false
    }
  } catch (error: any) {
    console.error('Error saving permissions:', error)
    toast.error(error.data?.message || 'Failed to update permissions', {
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
      class="sm:w-[380px] content-start"
      :can-close="!isSaving"
      @interact-outside="
        (e) => {
          if (isSaving) e.preventDefault()
        }
      "
    >
      <div class="grid gap-4 py-6">
        <DialogHeader class="px-6">
          <DialogTitle>Permissions</DialogTitle>
          <DialogDescription>
            {{ member.username || member.email }}
          </DialogDescription>
        </DialogHeader>

        <hr />

        <NestedCheckboxes
          v-model="permissionsState"
          class="px-6"
          :items="nestedItems"
          :disabled="isSaving"
        />

        <hr />

        <DialogFooter class="px-6">
          <Button variant="outline" :disabled="isSaving" @click="open = false">
            Cancel
          </Button>
          <Button :disabled="isSaving || !hasChanges" @click="savePermissions">
            {{ isSaving ? 'Saving...' : 'Save' }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
