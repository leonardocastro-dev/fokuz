<script setup lang="ts">
import { ref, computed } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { UserPlus } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { ROLES, PERMISSIONS } from '@/constants/permissions'
import { toast } from 'vue-sonner'
import { Skeleton } from '@/components/ui/skeleton'
import MemberItem from './MemberItem.vue'

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
  workspace: any
  members: Member[]
  isLoadingMembers: boolean
}>()

const { user } = useAuth()
const isInviting = ref(false)
const isSending = ref(false)
const memberEmail = ref('')

// Get current user's member data from the members list
const currentMember = computed(() => {
  if (!user.value) return null
  return props.members.find((m) => m.uid === user.value?.uid) || null
})

const currentUserRole = computed(() => currentMember.value?.role || null)
const currentUserPermissions = computed(
  () => currentMember.value?.permissions || null
)

// Check if current user can invite members
const canInviteMembers = computed(() => {
  if (!user.value) return false
  const role = currentUserRole.value
  if (role === ROLES.OWNER || role === ROLES.ADMIN) return true
  return (
    currentUserPermissions.value?.[PERMISSIONS.MANAGE_MEMBERS] === true ||
    currentUserPermissions.value?.[PERMISSIONS.ADD_MEMBERS] === true
  )
})

const handleInvite = async () => {
  if (!memberEmail.value) {
    toast.error('Please enter an email address', {
      style: { background: '#fda4af' },
      duration: 3000
    })
    return
  }

  if (!props.workspace || !user.value) {
    toast.error('Unable to send invitation', {
      style: { background: '#fda4af' },
      duration: 3000
    })
    return
  }

  try {
    isSending.value = true
    const idToken = await user.value.getIdToken()

    await $fetch('/api/invite/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`
      },
      body: {
        to: memberEmail.value,
        workspaceId: props.workspace.id
      }
    })

    toast.success(`Invitation sent to ${memberEmail.value}`, {
      style: { background: '#6ee7b7' },
      duration: 3000
    })

    memberEmail.value = ''
    isInviting.value = false
  } catch (error: any) {
    console.error('Error sending invitation:', error)
    const errorMessage = error.data?.message || 'Failed to send invitation'
    toast.error(errorMessage, {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isSending.value = false
  }
}

const emit = defineEmits<{
  inviteMember: [email: string]
  'member-removed': [memberId: string]
  'permissions-updated': []
  'member-role-updated': []
  'ownership-transferred': []
}>()

const handleMemberRemoved = (memberId: string) => {
  emit('member-removed', memberId)
}

const handlePermissionsUpdated = () => {
  emit('permissions-updated')
}

const handleMemberRoleUpdated = () => {
  emit('member-role-updated')
}

const handleOwnershipTransferred = () => {
  emit('ownership-transferred')
}
</script>

<template>
  <div
    class="flex sm:justify-between flex-col sm:flex-row sm:items-center justify-center mb-6"
  >
    <div>
      <h2 class="text-xl font-semibold">Workspace Members</h2>
      <p class="text-sm text-muted-foreground mt-1">
        {{ members.length || 0 }}
        {{ members.length === 1 ? 'member' : 'members' }}
      </p>
    </div>
    <Button
      v-if="canInviteMembers"
      class="flex mt-3 sm:mt-0 items-center gap-1"
      @click="isInviting = true"
    >
      <UserPlus class="h-5 w-5" />
      <span>Invite Member</span>
    </Button>
  </div>

  <Card>
    <CardContent>
      <!-- Loading Skeletons -->
      <div v-if="isLoadingMembers" class="space-y-4">
        <div
          v-for="i in 3"
          :key="i"
          class="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border rounded-lg"
        >
          <div class="flex items-center gap-3">
            <Skeleton class="hidden sm:flex h-10 w-10 rounded-full" />
            <div class="space-y-2">
              <Skeleton class="sm:h-4 h-3.5 w-32" />
              <Skeleton class="sm:h-3.5 h-3 w-24" />
            </div>
          </div>
          <div class="flex items-center justify-between sm:justify-end gap-2">
            <Skeleton class="flex sm:hidden h-9 w-9 rounded-full" />
            <Skeleton class="h-6 w-6" />
          </div>
        </div>
      </div>

      <!-- Members List -->
      <div v-else class="space-y-4">
        <MemberItem
          v-for="member in members"
          :key="member.uid"
          :member="member"
          :workspace-id="workspace.id"
          :current-user-role="currentUserRole"
          :current-user-permissions="currentUserPermissions"
          @member-removed="handleMemberRemoved"
          @permissions-updated="handlePermissionsUpdated"
          @role-updated="handleMemberRoleUpdated"
          @ownership-transferred="handleOwnershipTransferred"
        />
      </div>
    </CardContent>
  </Card>

  <!-- Invite Member Dialog -->
  <Dialog v-model:open="isInviting">
    <DialogContent
      :can-close="!isSending"
      @interact-outside="
        (e) => {
          if (isSending) e.preventDefault()
        }
      "
    >
      <div class="grid gap-4 p-6">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join this workspace
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="member-email">Email Address</Label>
            <Input
              id="member-email"
              v-model="memberEmail"
              type="email"
              placeholder="colleague@example.com"
              :disabled="isSending"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            :disabled="isSending"
            @click="isInviting = false"
          >
            Cancel
          </Button>
          <Button :disabled="isSending" @click="handleInvite">
            {{ isSending ? 'Sending...' : 'Send Invitation' }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
