<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'

const mobileMenuOpen = ref(false)
const scrolled = ref(false)

const navLinks = [
  { name: 'Features', href: '#features' },
  { name: 'How it works', href: '#how-it-works' },
  { name: 'Permissions', href: '#permissions' }
]

function onScroll() {
  scrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <!-- Mobile Header -->
  <header
    class="md:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-40 flex items-center justify-between px-6 transition-shadow duration-200"
    :class="mobileMenuOpen ? '' : 'shadow-sm'"
  >
    <NuxtLink to="#home">
      <img src="/logo-light.svg" alt="Fokuz" class="h-10" />
    </NuxtLink>
    <div
      :class="{ 'nav-burguer md:hidden': true, open: mobileMenuOpen }"
      @click="mobileMenuOpen = !mobileMenuOpen"
    >
      <span></span>
      <span></span>
      <span></span>
    </div>
  </header>

  <!-- Mobile Menu Overlay -->
  <Transition
    enter-active-class="transition-transform duration-200 ease-out"
    enter-from-class="-translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="-translate-y-full"
  >
    <div
      v-if="mobileMenuOpen"
      class="md:hidden fixed inset-0 top-16 bg-background z-30 flex flex-col origin-top"
    >
      <nav class="flex flex-col flex-1 gap-2 px-4 py-4">
        <a
          v-for="link in navLinks"
          :key="link.name"
          :href="link.href"
          class="flex items-center px-4 py-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
          @click="mobileMenuOpen = false"
        >
          {{ link.name }}
        </a>
        <div class="border-t my-2" />
        <div class="flex flex-col gap-2 px-4">
          <NuxtLink to="/login" @click="mobileMenuOpen = false">
            <Button variant="ghost" size="sm" class="w-full"> Login </Button>
          </NuxtLink>
          <div
            class="flex items-center border border-border rounded-lg overflow-hidden divide-x divide-border"
          >
            <NuxtLink
              to="/register"
              class="flex-1"
              @click="mobileMenuOpen = false"
            >
              <Button variant="default" size="sm" class="rounded-none w-full">
                Register
              </Button>
            </NuxtLink>
            <NuxtLink
              to="/workspaces"
              class="flex-1"
              @click="mobileMenuOpen = false"
            >
              <Button variant="ghost" size="sm" class="rounded-none w-full">
                Guest
              </Button>
            </NuxtLink>
          </div>
        </div>
      </nav>
    </div>
  </Transition>

  <!-- Desktop Header -->
  <header
    :class="[
      'hidden md:block sticky top-0 z-50 w-full border-b transition-all duration-300',
      scrolled
        ? 'border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm'
        : 'border-transparent bg-transparent'
    ]"
  >
    <div
      class="container mx-auto flex h-16 items-center justify-between px-4 md:px-6"
    >
      <NuxtLink to="#home">
        <img src="/logo-light.svg" alt="Fokuz" class="h-10" />
      </NuxtLink>

      <nav class="flex items-center space-x-8">
        <a
          v-for="link in navLinks"
          :key="link.name"
          :href="link.href"
          class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ link.name }}
        </a>
      </nav>

      <div class="flex items-center space-x-4">
        <NuxtLink to="/login">
          <Button variant="ghost" size="sm"> Login </Button>
        </NuxtLink>
        <div class="rounded-lg">
          <NuxtLink to="/register">
            <Button variant="default" size="sm" class="rounded-r-none h-9 px-4">
              Register
            </Button>
          </NuxtLink>
          <NuxtLink to="/workspaces">
            <Button variant="outline" size="sm" class="rounded-l-none h-9 px-4">
              Guest
            </Button>
          </NuxtLink>
        </div>
      </div>
    </div>
  </header>
</template>
