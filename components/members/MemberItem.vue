<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  MoreHorizontal,
  Crown,
  LockIcon,
  ShieldPlus,
  ShieldMinus,
  Lock,
  Trash2
} from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { ROLES, PERMISSIONS } from '@/constants/permissions'
import { toast } from 'vue-sonner'
import MemberPermissionsModal from './MemberPermissionsModal.vue'

interface Member {
  uid: string
  email: string
  username: string
  avatarUrl: string | null
  role?: string
  permissions?: Record<string, boolean> | null
  joinedAt?: any
}

const props = defineProps<{
  member: Member
  workspaceId: string
  currentUserRole: string | null
  currentUserPermissions: Record<string, boolean> | null
}>()

const emit = defineEmits<{
  'member-removed': [memberId: string]
  'permissions-updated': []
  'role-updated': []
  'ownership-transferred': []
}>()

const { user } = useAuth()
const isRemoving = ref(false)
const isPermissionsOpen = ref(false)
const isUpdatingAdminRole = ref(false)
const isTransferringOwnership = ref(false)
const confirmAdminOpen = ref(false)
const confirmOwnershipOpen = ref(false)
const confirmRemoveOpen = ref(false)
const pendingAdminAction = ref<boolean>(false)

const isOwner = computed(() => props.member.role === ROLES.OWNER)
const isAdmin = computed(() => props.member.role === ROLES.ADMIN)
const isCurrentUserOwner = computed(() => props.currentUserRole === ROLES.OWNER)
const isCurrentUserAdmin = computed(() => props.currentUserRole === ROLES.ADMIN)
const isCurrentUser = computed(() => props.member.uid === user.value?.uid)

const canManagePermissions = computed(() => {
  if (isOwner.value) return false
  if (isCurrentUser.value) return false
  if (isAdmin.value && !isCurrentUserOwner.value) return false
  return isCurrentUserOwner.value || isCurrentUserAdmin.value
})

const canRemoveMember = computed(() => {
  if (isOwner.value) return false
  if (isCurrentUser.value) return false
  if (isCurrentUserOwner.value) return true
  if (isAdmin.value) return false
  return (
    isCurrentUserAdmin.value ||
    props.currentUserPermissions?.[PERMISSIONS.MANAGE_MEMBERS] === true ||
    props.currentUserPermissions?.[PERMISSIONS.REMOVE_MEMBERS] === true
  )
})

const canToggleAdminRole = computed(() => {
  if (!isCurrentUserOwner.value) return false
  if (isCurrentUser.value) return false
  if (isOwner.value) return false
  return true
})

const canTransferOwnership = computed(() => {
  if (!isCurrentUserOwner.value) return false
  if (isCurrentUser.value) return false
  if (isOwner.value) return false
  return true
})

const showDropdown = computed(
  () =>
    canToggleAdminRole.value ||
    canTransferOwnership.value ||
    canManagePermissions.value ||
    canRemoveMember.value
)

const avatarFallback = computed(
  () => props.member.username?.charAt(0).toUpperCase() || '?'
)

const getAuthToken = async (): Promise<string | null> => {
  if (!user.value) return null
  return await user.value.getIdToken()
}

const removeMember = async () => {
  if (isRemoving.value) return

  try {
    isRemoving.value = true

    const token = await getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await $fetch<{ success: boolean }>(
      `/api/members/${props.member.uid}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        body: { workspaceId: props.workspaceId }
      }
    )

    if (response.success) {
      emit('member-removed', props.member.uid)
      confirmRemoveOpen.value = false
      toast.success('Member removed successfully', {
        style: { background: '#6ee7b7' },
        duration: 3000
      })
    }
  } catch (error: any) {
    console.error('Error removing member:', error)
    confirmRemoveOpen.value = false
    toast.error(error.data?.message || 'Failed to remove member', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isRemoving.value = false
  }
}

const requestAdminRoleChange = (shouldBeAdmin: boolean) => {
  pendingAdminAction.value = shouldBeAdmin
  confirmAdminOpen.value = true
}

const updateAdminRole = async (shouldBeAdmin: boolean) => {
  if (isUpdatingAdminRole.value) return

  try {
    isUpdatingAdminRole.value = true

    const token = await getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await $fetch<{ success: boolean }>(
      `/api/workspaces/${props.workspaceId}/members/${props.member.uid}/admin`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: { isAdmin: shouldBeAdmin }
      }
    )

    if (response.success) {
      emit('role-updated')
      confirmAdminOpen.value = false
      toast.success(
        shouldBeAdmin
          ? 'Member promoted to admin successfully'
          : 'Admin demoted to member successfully',
        {
          style: { background: '#6ee7b7' },
          duration: 3000
        }
      )
    }
  } catch (error: any) {
    console.error('Error updating admin role:', error)
    confirmAdminOpen.value = false
    toast.error(error.data?.message || 'Failed to update admin role', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isUpdatingAdminRole.value = false
  }
}

const requestTransferOwnership = () => {
  confirmOwnershipOpen.value = true
}

const transferOwnership = async () => {
  if (isTransferringOwnership.value) return

  try {
    isTransferringOwnership.value = true

    const token = await getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await $fetch<{ success: boolean }>(
      `/api/workspaces/${props.workspaceId}/ownership/transfer`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { targetMemberId: props.member.uid }
      }
    )

    if (response.success) {
      emit('ownership-transferred')
      confirmOwnershipOpen.value = false
      toast.success('Ownership transferred successfully', {
        style: { background: '#6ee7b7' },
        duration: 3000
      })
    }
  } catch (error: any) {
    console.error('Error transferring ownership:', error)
    confirmOwnershipOpen.value = false
    toast.error(error.data?.message || 'Failed to transfer ownership', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isTransferringOwnership.value = false
  }
}

const handlePermissionsUpdated = () => {
  emit('permissions-updated')
}
</script>

<template>
  <div
    class="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border rounded-lg transition-colors"
  >
    <div class="flex items-center gap-3 min-w-0">
      <Avatar :uid="member.uid" class="hidden sm:flex h-10 w-10 shrink-0">
        <AvatarImage
          v-if="member.avatarUrl"
          :src="member.avatarUrl"
          :alt="member.username"
        />
        <AvatarFallback>{{ avatarFallback }}</AvatarFallback>
      </Avatar>
      <div class="min-w-0 flex-1">
        <p class="font-medium text-foreground text-sm sm:text-base truncate">
          {{ member.username || member.email }}
        </p>
        <p class="text-xs sm:text-sm text-muted-foreground truncate">
          {{ member.email }}
        </p>
      </div>
    </div>

    <div
      class="flex items-center justify-between sm:justify-end gap-2 shrink-0"
    >
      <Avatar :uid="member.uid" class="flex sm:hidden h-9 w-9 shrink-0">
        <AvatarImage
          v-if="member.avatarUrl"
          :src="member.avatarUrl"
          :alt="member.username"
        />
        <AvatarFallback>{{ avatarFallback }}</AvatarFallback>
      </Avatar>

      <div class="flex items-center gap-2">
        <Badge v-if="isOwner" variant="secondary" class="gap-1">
          <Crown class="h-3 w-3" />
          Owner
        </Badge>
        <Badge v-else-if="isAdmin" variant="outline" class="gap-1">
          <LockIcon class="h-3 w-3" />
          Admin
        </Badge>

        <DropdownMenu v-if="showDropdown">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="sm" class="h-6 w-6 p-0">
              <span class="sr-only">Open menu</span>
              <MoreHorizontal class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              v-if="canManagePermissions"
              @click="isPermissionsOpen = true"
            >
              <LockIcon class="h-4 w-4" />
              Permissions
            </DropdownMenuItem>
            <DropdownMenuItem
              v-else
              disabled
              class="flex items-center gap-2 opacity-50 cursor-not-allowed"
            >
              <Lock class="h-4 w-4" />
              Permissions
            </DropdownMenuItem>

            <DropdownMenuSeparator
              v-if="canToggleAdminRole || canTransferOwnership"
            />

            <DropdownMenuItem
              v-if="canToggleAdminRole && !isAdmin"
              :disabled="isUpdatingAdminRole"
              @click="requestAdminRoleChange(true)"
            >
              <ShieldPlus class="h-4 w-4" />
              {{ isUpdatingAdminRole ? 'Updating...' : 'Promote to Admin' }}
            </DropdownMenuItem>

            <DropdownMenuItem
              v-if="canToggleAdminRole && isAdmin"
              :disabled="isUpdatingAdminRole"
              @click="requestAdminRoleChange(false)"
            >
              <ShieldMinus class="h-4 w-4" />
              {{ isUpdatingAdminRole ? 'Updating...' : 'Demote Admin' }}
            </DropdownMenuItem>

            <DropdownMenuItem
              v-if="canTransferOwnership"
              :disabled="isTransferringOwnership"
              @click="requestTransferOwnership"
            >
              <Crown class="h-4 w-4" />
              {{
                isTransferringOwnership
                  ? 'Transferring...'
                  : 'Transfer Ownership'
              }}
            </DropdownMenuItem>

            <DropdownMenuSeparator v-if="canRemoveMember" />

            <DropdownMenuItem
              v-if="canRemoveMember"
              class="flex items-center gap-2 text-destructive focus:text-destructive"
              @click="confirmRemoveOpen = true"
            >
              <Trash2 class="h-4 w-4 text-destructive/50" />
              Remove Member
            </DropdownMenuItem>
            <DropdownMenuItem
              v-else
              disabled
              class="flex items-center gap-2 opacity-50 cursor-not-allowed text-destructive/50"
            >
              <Lock class="h-4 w-4 text-destructive/50" />
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>

  <MemberPermissionsModal
    v-model:open="isPermissionsOpen"
    :member="member"
    :workspace-id="workspaceId"
    @permissions-updated="handlePermissionsUpdated"
  />

  <!-- Admin Role Confirmation -->
  <Dialog v-model:open="confirmAdminOpen">
    <DialogContent
      class="sm:max-w-md"
      :can-close="!isUpdatingAdminRole"
      @interact-outside="
        (e) => {
          if (isUpdatingAdminRole) e.preventDefault()
        }
      "
    >
      <div class="grid gap-4 p-6">
        <DialogHeader>
          <DialogTitle>
            {{ pendingAdminAction ? 'Promote to Admin' : 'Demote Admin' }}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to
            {{ pendingAdminAction ? 'promote' : 'demote' }}
            <strong>{{ member.username || member.email }}</strong>
            to {{ pendingAdminAction ? 'admin' : 'member' }}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            :disabled="isUpdatingAdminRole"
            @click="confirmAdminOpen = false"
          >
            Cancel
          </Button>
          <Button
            :disabled="isUpdatingAdminRole"
            @click="updateAdminRole(pendingAdminAction)"
          >
            {{ isUpdatingAdminRole ? 'Updating...' : 'Confirm' }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Transfer Ownership Confirmation -->
  <Dialog v-model:open="confirmOwnershipOpen">
    <DialogContent
      class="sm:max-w-md"
      :can-close="!isTransferringOwnership"
      @interact-outside="
        (e) => {
          if (isTransferringOwnership) e.preventDefault()
        }
      "
    >
      <div class="grid gap-4 p-6">
        <DialogHeader>
          <DialogTitle>Transfer Ownership</DialogTitle>
          <DialogDescription>
            Transfer workspace ownership to
            <strong>{{ member.username || member.email }}</strong
            >? This action cannot be undone automatically.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            :disabled="isTransferringOwnership"
            @click="confirmOwnershipOpen = false"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :disabled="isTransferringOwnership"
            @click="transferOwnership"
          >
            {{
              isTransferringOwnership
                ? 'Transferring...'
                : 'Transfer Ownership'
            }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Remove Member Confirmation -->
  <Dialog v-model:open="confirmRemoveOpen">
    <DialogContent
      class="sm:max-w-md"
      :can-close="!isRemoving"
      @interact-outside="
        (e) => {
          if (isRemoving) e.preventDefault()
        }
      "
    >
      <div class="grid gap-4 p-6">
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove
            <strong>{{ member.username || member.email }}</strong>
            from this workspace?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            :disabled="isRemoving"
            @click="confirmRemoveOpen = false"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :disabled="isRemoving"
            @click="removeMember"
          >
            {{ isRemoving ? 'Removing...' : 'Remove' }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
