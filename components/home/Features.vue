<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import {
  Layers,
  Users,
  AlertTriangle,
  CalendarClock,
  SlidersHorizontal,
  UserX
} from 'lucide-vue-next'
import { useScrollReveal } from '@/composables/useScrollReveal'

useScrollReveal()

const features = [
  {
    icon: Layers,
    title: 'Three-tier hierarchy',
    description:
      'Workspaces → Projects → Tasks. Keep work contextual and scoped — no flat list of tasks lost in a sea of noise.'
  },
  {
    icon: Users,
    title: 'Real-time collaboration',
    description:
      'Multi-assignee tasks, member avatars, and Firebase-backed sync keep every teammate on the same page.'
  },
  {
    icon: AlertTriangle,
    title: 'Priority levels',
    description:
      'Three levels — Urgent, Important, Normal — surfaced visually with colour-coded badges so critical work is never buried.'
  },
  {
    icon: CalendarClock,
    title: 'Due dates & overdue alerts',
    description:
      'Set due dates on tasks. Overdue items are flagged automatically so nothing slips through without notice.'
  },
  {
    icon: SlidersHorizontal,
    title: 'Advanced filtering & search',
    description:
      'Filter by scope (all vs. assigned), status, priority, date range, or free-text search — combine them to find anything instantly.'
  },
  {
    icon: UserX,
    title: 'Guest mode — zero friction',
    description:
      'Full task management with no account required. Data lives in localStorage and migrates seamlessly when you sign up.'
  }
]
</script>

<template>
  <section id="features" class="bg-background">
    <div class="container mx-auto px-4 md:px-6">
      <div class="text-center space-y-4 mb-16 reveal">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Everything a serious team needs
        </h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
          Built around how teams actually work — not a dumbed-down to-do list
        </p>
      </div>

      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 reveal-stagger">
        <Card
          v-for="(feature, index) in features"
          :key="index"
          class="group border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
        >
          <CardContent class="p-6 space-y-4">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary group-hover:scale-110 transition-transform"
            >
              <component
                :is="feature.icon"
                class="h-7 w-7 text-primary-foreground"
              />
            </div>
            <div class="space-y-2">
              <h3 class="text-xl font-semibold text-foreground">
                {{ feature.title }}
              </h3>
              <p class="text-muted-foreground">
                {{ feature.description }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>
