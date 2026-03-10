<script setup lang="ts">
import { Github } from 'lucide-vue-next'

const currentYear = new Date().getFullYear()

const footerLinks = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'How it works', href: '#how-it-works' },
    { name: 'Permissions', href: '#permissions' }
  ],
  getStarted: [
    { name: 'Create account', href: '/register' },
    { name: 'Login', href: '/login' },
    { name: 'Try as guest', href: '/workspaces' }
  ]
}
</script>

<template>
  <footer class="border-t border-border bg-background">
    <div class="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div class="lg:col-span-2 space-y-4">
          <NuxtLink to="/">
            <img src="/logo-light.svg" alt="Fokuz" class="h-10" />
          </NuxtLink>
          <p class="text-sm text-muted-foreground max-w-sm">
            Workspace-based task management for collaborative teams. Three-tier
            hierarchy, granular permissions, guest mode included.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            aria-label="GitHub"
          >
            <Github class="h-5 w-5" />
          </a>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-foreground">Product</h3>
          <ul class="space-y-2">
            <li v-for="link in footerLinks.product" :key="link.name">
              <a
                :href="link.href"
                class="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {{ link.name }}
              </a>
            </li>
          </ul>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-foreground">Get started</h3>
          <ul class="space-y-2">
            <li v-for="link in footerLinks.getStarted" :key="link.name">
              <NuxtLink
                :to="link.href"
                class="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {{ link.name }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div
        class="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4"
      >
        <p class="text-sm text-muted-foreground">
          © {{ currentYear }} Fokuz. Open source project.
        </p>
      </div>
    </div>
  </footer>
</template>
