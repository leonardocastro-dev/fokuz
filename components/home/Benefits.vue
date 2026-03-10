<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { ShieldCheck, GitMerge, Workflow } from 'lucide-vue-next'
import { useScrollReveal } from '@/composables/useScrollReveal'

useScrollReveal()

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Server-enforced permissions',
    description:
      'Roles and permissions are validated server-side on every API call — not just hidden in the UI. Your data stays safe even if the frontend is bypassed.',
    gradient: 'from-accent to-primary'
  },
  {
    icon: GitMerge,
    title: 'Structured, not chaotic',
    description:
      'The three-tier Workspace → Project → Task model gives work the right context. No more flat lists where everything competes for attention.',
    gradient: 'from-primary to-primary-glow'
  },
  {
    icon: Workflow,
    title: 'Works for guests too',
    description:
      'You can use Fokuz right now without creating an account. All your guest data migrates automatically when you eventually sign up.',
    gradient: 'from-primary-glow to-accent'
  }
]
</script>

<template>
  <section id="benefits" class="pb-20 md:pb-28 bg-gradient-subtle">
    <div class="container mx-auto px-4 md:px-6">
      <div class="text-center space-y-4 mb-16 reveal">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Why
          <span class="bg-gradient-primary bg-clip-text text-transparent">
            Fokuz
          </span>
          ?
        </h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
          The right balance of structure, flexibility, and simplicity for teams
          that ship
        </p>
      </div>

      <div class="grid gap-8 md:grid-cols-3 reveal-stagger">
        <Card
          v-for="(benefit, index) in benefits"
          :key="index"
          class="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
        >
          <div
            :class="`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${benefit.gradient}`"
          />

          <CardContent class="p-8 space-y-4">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary group-hover:scale-110 transition-transform"
            >
              <component
                :is="benefit.icon"
                class="h-8 w-8 text-primary-foreground"
              />
            </div>

            <div class="space-y-3">
              <h3 class="text-2xl font-bold text-foreground">
                {{ benefit.title }}
              </h3>
              <p class="text-muted-foreground leading-relaxed">
                {{ benefit.description }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>
