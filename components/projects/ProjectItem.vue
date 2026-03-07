<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { WorkspaceMember } from '@/composables/useMembers'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Lock, Trash2, PenLine, Users } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import ProjectMembersModal from './ProjectMembersModal.vue'

const props = defineProps<{
  project: Project
  workspaceMembers: WorkspaceMember[]
  assignedMemberIds: string[]
}>()

const emit = defineEmits<{
  edit: [project: Project]
  'members-updated': []
}>()

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const { user } = useAuth()
const isMembersOpen = ref(false)
const canEdit = computed(() => projectStore.canEditProjects)
const canDelete = computed(() => projectStore.canDeleteProjects)
const canManageMembers = computed(() => projectStore.canAssignProjectMembers)
const hasAnyAction = computed(
  () => canEdit.value || canDelete.value || canManageMembers.value
)

const projectMembersWithData = computed(() => {
  if (!props.workspaceMembers || props.workspaceMembers.length === 0) {
    return []
  }

  // Filter members who are assigned to this project via projectAssignments
  return props.workspaceMembers.filter((member) => {
    return props.assignedMemberIds.includes(member.uid)
  })
})

const displayedMembers = computed(() =>
  projectMembersWithData.value.slice(0, 3)
)
const extraMembersCount = computed(() =>
  Math.max(0, projectMembersWithData.value.length - 3)
)

const goToProject = () => {
  const workspaceId = route.params.workspace as string
  router.push(`/${workspaceId}/projects/${props.project.id}`)
}

const handleEdit = () => {
  emit('edit', props.project)
}

const taskCount = computed(() => props.project.taskCount || 0)
const completedTaskCount = computed(() => props.project.completedTaskCount || 0)
const completionPercentage = computed(() =>
  taskCount.value > 0
    ? Math.round((completedTaskCount.value / taskCount.value) * 100)
    : 0
)
</script>

<template>
  <Card
    class="relative aspect-[1.55] hover:shadow-lg transition-shadow cursor-pointer"
    @click="goToProject"
  >
    <CardContent class="flex flex-col justify-between h-full">
      <div class="flex flex-col gap-2">
        <div
          class="w-11 h-11 rounded-full flex items-center justify-center bg-muted"
        >
          <span v-if="project.emoji" class="text-xl">{{ project.emoji }}</span>
          <span v-else class="text-lg font-semibold text-muted-foreground">{{
            project.title?.charAt(0).toUpperCase()
          }}</span>
        </div>
        <h3 class="text-lg font-semibold line-clamp-2 truncate">
          {{ project.title }}
        </h3>
        <p
          v-if="project.description"
          class="text-sm truncate text-muted-foreground mb-2 line-clamp-2"
        >
          {{ project.description }}
        </p>
      </div>

      <div class="mt-auto space-y-3">
        <div v-if="taskCount > 0">
          <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all duration-300"
              :style="{ width: `${completionPercentage}%` }"
            />
          </div>
          <p class="text-[10px] text-muted-foreground mt-1">
            {{ completedTaskCount }} of {{ taskCount }} tasks completed
          </p>
        </div>

        <div
          class="flex min-h-8 items-center justify-between w-full gap-4 text-xs text-muted-foreground"
        >
          <div
            v-if="projectMembersWithData.length > 0"
            class="flex -space-x-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:ring-2"
          >
            <Avatar
              v-for="member in displayedMembers"
              :key="member.uid"
              :uid="member.uid"
              class="h-8 w-8"
            >
              <AvatarImage
                v-if="member.avatarUrl"
                :src="member.avatarUrl"
                :alt="member.username || ''"
              />
              <AvatarFallback class="text-xs">
                {{ member.username?.charAt(0).toUpperCase() || '?' }}
              </AvatarFallback>
            </Avatar>
            <Avatar v-if="extraMembersCount > 0" class="h-8 w-8">
              <AvatarFallback class="text-xs bg-muted">
                +{{ extraMembersCount }}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <DropdownMenu v-if="hasAnyAction">
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="sm"
            class="absolute top-3 right-3 h-8 w-8 p-0"
            @click.stop
          >
            <span class="sr-only">Open menu</span>
            <MoreHorizontal class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            v-if="canEdit"
            class="flex items-center gap-2"
            @click.stop="handleEdit"
          >
            <PenLine class="h-3 w-3" />
            Edit Project
          </DropdownMenuItem>
          <DropdownMenuItem
            v-else
            disabled
            class="flex items-center gap-2 opacity-50 cursor-not-allowed"
          >
            <Lock class="h-3 w-3" />
            Edit Project
          </DropdownMenuItem>

          <DropdownMenuItem
            v-if="canManageMembers"
            class="flex items-center gap-2"
            @click.stop="isMembersOpen = true"
          >
            <Users class="h-3 w-3" />
            Manage Members
          </DropdownMenuItem>
          <DropdownMenuItem
            v-else
            disabled
            class="flex items-center gap-2 opacity-50 cursor-not-allowed"
          >
            <Lock class="h-3 w-3" />
            Manage Members
          </DropdownMenuItem>

          <DropdownMenuItem
            v-if="canDelete"
            class="flex items-center gap-2 text-destructive focus:text-destructive"
            @click.stop="projectStore.deleteProject(project.id, user?.uid)"
          >
            <Trash2 class="h-3 w-3 text-destructive/50" />
            Delete Project
          </DropdownMenuItem>
          <DropdownMenuItem
            v-else
            disabled
            class="flex items-center gap-2 opacity-50 cursor-not-allowed text-destructive/50"
          >
            <Lock class="h-3 w-3 text-destructive/50" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardContent>
  </Card>

  <ProjectMembersModal
    v-model:open="isMembersOpen"
    :project="project"
    :workspace-id="route.params.workspace as string"
    @members-updated="emit('members-updated')"
  />
</template>
