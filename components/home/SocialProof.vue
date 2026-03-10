<script setup lang="ts">
import { Github, Zap, UserCheck, Shield } from 'lucide-vue-next'

const items = [
  { icon: Github, label: 'Open source' },
  { icon: Zap, label: 'Firebase-powered' },
  { icon: UserCheck, label: 'No-signup guest mode' },
  { icon: Shield, label: 'Granular permissions' }
]
</script>

<template>
  <div class="border-y border-border bg-muted/40 py-5">
    <div class="container mx-auto px-4 md:px-6">
      <div
        class="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-medium text-muted-foreground"
      >
        <div
          v-for="item in items"
          :key="item.label"
          class="flex items-center gap-2"
        >
          <component :is="item.icon" class="h-4 w-4 text-primary" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
