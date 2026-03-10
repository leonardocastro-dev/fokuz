<script setup lang="ts">
const steps = [
  {
    number: '01',
    title: 'Create a workspace & invite your team',
    description:
      'Set up a shared workspace in seconds. Invite members by email and assign roles — Owner, Admin, or Member — with fine-grained permission control from day one.'
  },
  {
    number: '02',
    title: 'Organize work into projects',
    description:
      'Group related tasks into projects. Assign specific members to each project and define per-project permission overrides so the right people have the right access.'
  },
  {
    number: '03',
    title: 'Add tasks, set priorities & track progress',
    description:
      'Create tasks with priority levels (Urgent / Important / Normal), due dates, and multiple assignees. Use advanced filters — by scope, status, priority, date, or search — to stay on top of what matters.'
  }
]
</script>

<template>
  <section id="how-it-works" class="py-20 md:py-28 bg-gradient-subtle">
    <div class="container mx-auto px-4 md:px-6">
      <div class="text-center space-y-4 mb-16 reveal">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          From zero to organised in
          <span class="bg-gradient-primary bg-clip-text text-transparent">
            three steps
          </span>
        </h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
          A workflow designed for real teams, not solo to-do lists
        </p>
      </div>

      <div class="flex flex-col gap-10 max-w-3xl mx-auto">
        <div
          v-for="step in steps"
          :key="step.number"
          class="reveal flex gap-6 items-start"
        >
          <div
            class="flex-shrink-0 text-6xl font-black bg-gradient-primary bg-clip-text text-transparent leading-none select-none"
          >
            {{ step.number }}
          </div>
          <div class="space-y-2 pt-2">
            <h3 class="text-xl font-bold text-foreground">{{ step.title }}</h3>
            <p class="text-muted-foreground leading-relaxed">
              {{ step.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
