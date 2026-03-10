<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LogOut, Lock, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'

const { user, userProfile, logout } = useAuth()
const route = useRoute()
const projectStore = useProjectStore()
const { workspace } = useWorkspace()

const workspaceSlug = computed(() => route.params.workspace as string)
const isGuest = computed(() => !user.value)
const isMobileMenuOpen = ref(false)
const projectsExpanded = ref(false)

watch(
  () => route.path,
  (path) => {
    if (path.includes('/projects/')) projectsExpanded.value = true
  },
  { immediate: true }
)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const isWorkspaceSectionActive = (section: string) => {
  const basePath = `/${workspaceSlug.value}/${section}`
  return route.path === basePath || route.path.startsWith(`${basePath}/`)
}

// Close menu on route change
watch(() => route.fullPath, closeMobileMenu)
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <header
      class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-40 flex items-center justify-between px-6 transition-shadow duration-200"
      :class="isMobileMenuOpen ? '' : 'shadow-sm'"
    >
      <NuxtLink to="/workspaces">
        <img src="/logo-light.svg" alt="Fokuz" class="h-9" />
      </NuxtLink>
      <div
        :class="{ 'nav-burguer lg:hidden': true, open: isMobileMenuOpen }"
        @click="toggleMobileMenu"
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
    </header>

    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="-translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="-translate-y-full"
    >
      <div
        v-if="isMobileMenuOpen"
        class="lg:hidden fixed inset-0 top-16 bg-background z-30 flex flex-col origin-top"
      >
        <nav
          aria-label="Main navigation"
          class="flex flex-col flex-1 gap-2 px-4 py-4"
        >
          <NuxtLink
            :to="`/${workspaceSlug}/tasks`"
            class="flex items-center px-4 py-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
            :class="{
              '!text-primary !bg-accent': isWorkspaceSectionActive('tasks')
            }"
            @click="closeMobileMenu"
          >
            Tasks
          </NuxtLink>
          <NuxtLink
            :to="`/${workspaceSlug}/projects`"
            class="flex items-center px-4 py-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
            :class="{
              '!text-primary !bg-accent': isWorkspaceSectionActive('projects')
            }"
            @click="closeMobileMenu"
          >
            Projects
          </NuxtLink>
          <div
            v-if="isGuest"
            class="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-md transition-colors text-muted-foreground/50 cursor-not-allowed opacity-60"
            title="Members feature is only available for logged-in users"
          >
            <Lock class="h-4 w-4" />
            <span>Members</span>
          </div>
          <NuxtLink
            v-else
            :to="`/${workspaceSlug}/members`"
            class="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-md transition-colors text-muted-foreground hover:text-primary hover:bg-accent"
            :class="{
              '!text-primary !bg-accent': isWorkspaceSectionActive('members')
            }"
            @click="closeMobileMenu"
          >
            <span>Members</span>
          </NuxtLink>

          <div class="border-t my-2" />

          <NuxtLink
            to="/workspaces"
            class="flex items-center px-4 py-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
            @click="closeMobileMenu"
          >
            Workspaces
          </NuxtLink>
          <div
            v-if="isGuest"
            class="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-md transition-colors text-muted-foreground/50 cursor-not-allowed opacity-60"
            title="Settings is only available for logged-in users"
          >
            <Lock class="h-4 w-4" />
            <span>Settings</span>
          </div>
          <NuxtLink
            v-else
            :to="`/settings?from=${workspaceSlug}`"
            class="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-md transition-colors text-muted-foreground hover:text-primary hover:bg-accent"
            active-class="!text-primary !bg-accent"
            @click="closeMobileMenu"
          >
            <span>Settings</span>
          </NuxtLink>
        </nav>

        <div class="p-4 border-t">
          <div v-if="workspace?.name" class="mb-3 px-2">
            <p
              class="text-xs text-muted-foreground uppercase tracking-wide font-medium"
            >
              Workspace
            </p>
            <p class="text-sm font-semibold text-foreground truncate mt-0.5">
              {{ workspace.name }}
            </p>
          </div>
          <div v-if="user">
            <div class="mb-3 px-2">
              <p class="text-sm text-muted-foreground truncate">
                {{ userProfile?.username || user.email }}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              class="w-full flex items-center justify-center gap-2"
              @click="logout"
            >
              <LogOut class="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>

          <div v-else class="space-y-2">
            <Button
              variant="default"
              size="sm"
              class="w-full"
              @click="$router.push('/login')"
            >
              Login
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="w-full"
              @click="$router.push('/register')"
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <aside
      class="hidden lg:flex w-64 bg-background border-r fixed h-screen flex-col"
    >
      <div class="p-6 pb-4">
        <NuxtLink to="/workspaces">
          <img src="/logo-light.svg" alt="Fokuz" class="h-10" />
        </NuxtLink>
        <div v-if="workspace?.name" class="mt-4 px-1">
          <p
            class="text-xs text-muted-foreground uppercase tracking-wide font-medium"
          >
            Workspace
          </p>
          <p class="text-sm font-semibold text-foreground truncate mt-0.5">
            {{ workspace.name }}
          </p>
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        class="flex flex-col flex-1 gap-2 px-4 py-2"
      >
        <NuxtLink
          :to="`/${workspaceSlug}/tasks`"
          class="flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
          :class="{
            '!text-primary !bg-accent': isWorkspaceSectionActive('tasks')
          }"
        >
          <span>Tasks</span>
        </NuxtLink>
        <div>
          <div
            class="flex w-full items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors"
            :class="
              isWorkspaceSectionActive('projects')
                ? 'text-primary bg-accent'
                : 'text-muted-foreground hover:text-primary hover:bg-accent'
            "
          >
            <NuxtLink
              :to="`/${workspaceSlug}/projects`"
              class="flex-1 text-left"
            >
              Projects
            </NuxtLink>
            <button
              class="rounded cursor-pointer p-1 transition-colors hover:bg-primary/20"
              @click="projectsExpanded = !projectsExpanded"
            >
              <ChevronRight
                class="h-4 w-4 transition-transform duration-200 shrink-0"
                :class="projectsExpanded ? 'rotate-90' : ''"
              />
            </button>
          </div>
          <div v-if="projectsExpanded" class="mt-1 flex flex-col gap-0.5 pl-4">
            <NuxtLink
              v-for="project in projectStore.sortedProjects"
              :key="project.id"
              :to="`/${workspaceSlug}/projects/${project.id}`"
              class="flex items-center gap-2 px-4 py-1.5 text-sm rounded-md transition-colors text-muted-foreground hover:text-primary hover:bg-accent"
              :class="{
                '!text-primary !bg-accent':
                  route.path === `/${workspaceSlug}/projects/${project.id}`
              }"
            >
              <span v-if="project.emoji" class="text-base leading-none">{{
                project.emoji
              }}</span>
              <span class="truncate">{{ project.title }}</span>
            </NuxtLink>
            <span
              v-if="!projectStore.sortedProjects.length"
              class="px-4 py-1.5 text-xs text-muted-foreground/60 italic"
            >
              No projects yet
            </span>
          </div>
        </div>
        <div
          v-if="isGuest"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground/50 cursor-not-allowed opacity-60"
          title="Members feature is only available for logged-in users"
        >
          <Lock class="h-4 w-4" />
          <span>Members</span>
        </div>
        <NuxtLink
          v-else
          :to="`/${workspaceSlug}/members`"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-primary hover:bg-accent"
          :class="{
            '!text-primary !bg-accent': isWorkspaceSectionActive('members')
          }"
        >
          <span>Members</span>
        </NuxtLink>

        <div class="border-t my-2" />

        <NuxtLink
          to="/workspaces"
          class="flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
        >
          Workspaces
        </NuxtLink>
        <div
          v-if="isGuest"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground/50 cursor-not-allowed opacity-60"
          title="Settings is only available for logged-in users"
        >
          <Lock class="h-4 w-4" />
          <span>Settings</span>
        </div>
        <NuxtLink
          v-else
          :to="`/settings?from=${workspaceSlug}`"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-primary hover:bg-accent"
          active-class="!text-primary !bg-accent"
        >
          <span>Settings</span>
        </NuxtLink>
      </nav>

      <div class="p-4 border-t">
        <div v-if="user">
          <div class="mb-3 px-2">
            <p class="text-sm text-muted-foreground truncate">
              {{ userProfile?.username || user.email }}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            class="w-full flex items-center justify-center gap-2"
            @click="logout"
          >
            <LogOut class="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>

        <div v-else class="space-y-2">
          <Button
            variant="default"
            size="sm"
            class="w-full"
            @click="$router.push('/login')"
          >
            Login
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="w-full"
            @click="$router.push('/register')"
          >
            Register
          </Button>
        </div>
      </div>
    </aside>

    <main class="flex-1 overflow-hidden lg:ml-64 p-6 pt-20 lg:pt-6">
      <slot />
    </main>
  </div>
</template>
