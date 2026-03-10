<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'

const roles = [
  {
    name: 'Owner',
    badge: 'bg-purple-100 text-purple-700',
    description: 'Full control over the workspace.',
    permissions: [
      'Manage workspace settings',
      'Invite & remove members',
      'Manage projects',
      'Create, edit & delete tasks',
      'Manage member roles'
    ]
  },
  {
    name: 'Admin',
    badge: 'bg-blue-100 text-blue-700',
    description: 'Broad access without billing controls.',
    permissions: [
      'Invite & remove members',
      'Manage projects',
      'Create, edit & delete tasks',
      'Assign tasks to members',
      'View all workspace data'
    ]
  },
  {
    name: 'Member',
    badge: 'bg-emerald-100 text-emerald-700',
    description: 'Scoped access with granular overrides.',
    permissions: [
      'View assigned projects',
      'Create tasks (if permitted)',
      'Edit own tasks (if permitted)',
      'Toggle task status (if permitted)',
      'Per-project permission overrides'
    ]
  }
]
</script>

<template>
  <section id="permissions" class="py-20 md:py-28 bg-background">
    <div class="container mx-auto px-4 md:px-6">
      <div class="text-center space-y-4 mb-16 reveal">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Control without micromanagement
        </h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
          A three-tier role system with per-project overrides — enforced
          server-side, not just in the UI
        </p>
      </div>

      <div class="grid gap-8 md:grid-cols-3 reveal-stagger">
        <Card
          v-for="role in roles"
          :key="role.name"
          class="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
        >
          <CardContent class="p-6 space-y-4">
            <div class="flex items-center gap-3">
              <span
                :class="[
                  'text-sm font-semibold px-3 py-1 rounded-full',
                  role.badge
                ]"
              >
                {{ role.name }}
              </span>
            </div>
            <p class="text-sm text-muted-foreground">{{ role.description }}</p>
            <ul class="space-y-2">
              <li
                v-for="perm in role.permissions"
                :key="perm"
                class="flex items-start gap-2 text-sm"
              >
                <Check class="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                {{ perm }}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <!-- Per-project override callout -->
      <div
        class="reveal mt-10 mx-auto max-w-2xl rounded-xl border border-primary/30 bg-primary/5 p-6 text-center space-y-2"
      >
        <p class="font-semibold text-foreground">
          Per-project permission overrides
        </p>
        <p class="text-sm text-muted-foreground">
          Members can be granted extra permissions on specific projects — for
          example, a member can create tasks in one project without having that
          ability workspace-wide. All enforced on the server, not just hidden in
          the UI.
        </p>
      </div>
    </div>
  </section>
</template>
