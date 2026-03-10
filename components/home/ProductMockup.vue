<script setup lang="ts">
import {
  Search,
  Clock,
  Users,
  ChevronRight,
  Plus,
  ListTodo,
  CheckCircle2,
  RefreshCw,
  Flag,
  Layers,
  Filter,
  Check,
  LoaderCircle
} from 'lucide-vue-next'
</script>

<template>
  <section class="py-20 md:py-28 bg-background overflow-hidden">
    <div class="container mx-auto px-4 md:px-6">
      <div class="text-center space-y-4 mb-14 reveal">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          <span class="md:hidden">Your work, organized</span>
          <span class="hidden md:inline">See it in action</span>
        </h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
          A real look at the interface your team will actually use
        </p>
      </div>

      <!-- Mobile: bento grid (hidden on md+) -->
      <div
        class="md:hidden grid grid-cols-2 gap-3 reveal-stagger"
        aria-hidden="true"
      >
        <!-- Featured: Priority — full width -->
        <div
          class="col-span-2 rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4 shadow-lg"
          style="
            box-shadow: 0 0 32px -8px
              color-mix(in oklab, var(--primary-glow) 25%, transparent);
          "
        >
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-md"
          >
            <Flag class="h-5 w-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-bold">Priority levels</p>
            <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
              Urgent, important, and normal — always visible at a glance
            </p>
            <div class="flex gap-1.5 mt-2">
              <span
                class="priority-badge-urgent text-[10px] px-1.5 py-0.5 rounded font-semibold"
                >Urgent</span
              >
              <span
                class="priority-badge-important text-[10px] px-1.5 py-0.5 rounded font-semibold"
                >Important</span
              >
              <span
                class="priority-badge-normal text-[10px] px-1.5 py-0.5 rounded font-semibold"
                >Normal</span
              >
            </div>
          </div>
        </div>

        <!-- Due dates -->
        <div
          class="rounded-2xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 shadow-sm"
          >
            <Clock class="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p class="text-sm font-semibold">Due dates</p>
            <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
              Deadlines and overdue alerts
            </p>
          </div>
        </div>

        <!-- Assignees -->
        <div
          class="rounded-2xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 shadow-sm"
          >
            <Users class="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-sm font-semibold">Assignees</p>
            <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
              Multi-member task ownership
            </p>
          </div>
        </div>

        <!-- Featured: Progress — full width -->
        <div
          class="col-span-2 rounded-2xl border border-border bg-card p-5 flex items-center gap-4 hover:border-primary/30 transition-colors"
        >
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shadow-sm"
          >
            <CheckCircle2
              class="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm font-bold">Track progress</p>
            <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
              See what's pending and done across your whole team
            </p>
            <div
              class="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden"
            >
              <div class="h-full w-[62%] rounded-full bg-gradient-primary" />
            </div>
            <p class="text-[10px] text-muted-foreground mt-1">
              5 of 8 tasks completed
            </p>
          </div>
        </div>

        <!-- Projects -->
        <div
          class="rounded-2xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 shadow-sm"
          >
            <Layers class="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p class="text-sm font-semibold">Projects</p>
            <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
              Organized by context
            </p>
          </div>
        </div>

        <!-- Filters -->
        <div
          class="rounded-2xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 shadow-sm"
          >
            <Filter class="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <p class="text-sm font-semibold">Filters</p>
            <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
              Search by status, priority, date
            </p>
          </div>
        </div>
      </div>

      <!-- Desktop: Browser chrome wrapper -->
      <div
        class="float-animation mx-auto max-w-4xl rounded-2xl border border-border shadow-2xl overflow-hidden hidden md:block"
        aria-hidden="true"
      >
        <!-- Title bar -->
        <div
          class="flex items-center gap-3 bg-muted/60 px-4 py-3 border-b border-border"
        >
          <div class="flex gap-1.5">
            <div class="h-3 w-3 rounded-full bg-red-400" />
            <div class="h-3 w-3 rounded-full bg-yellow-400" />
            <div class="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div
            class="flex-1 bg-background/80 rounded-md px-3 py-1 text-xs text-muted-foreground text-center mx-8"
          >
            fokuz.leocastro.me/my-workspace/projects/frontend
          </div>
        </div>

        <!-- App layout -->
        <div class="flex h-[420px] bg-background">
          <!-- Sidebar -->
          <div
            class="w-52 flex-shrink-0 border-r border-border bg-background flex flex-col"
          >
            <!-- Logo + workspace -->
            <div class="p-4 pb-3">
              <img src="/logo-light.svg" alt="Fokuz" class="h-7" />
              <div class="mt-3 px-1">
                <p
                  class="text-[10px] text-muted-foreground uppercase tracking-wide font-medium"
                >
                  Workspace
                </p>
                <p class="text-xs font-semibold text-foreground mt-0.5">
                  Acme Corp
                </p>
              </div>
            </div>

            <!-- Nav -->
            <nav class="flex flex-col flex-1 gap-1 px-2 py-1">
              <div
                class="flex items-center px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-md"
              >
                Tasks
              </div>

              <!-- Projects with chevron (expanded) -->
              <div>
                <div
                  class="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-primary bg-accent rounded-md"
                >
                  <span>Projects</span>
                  <div class="rounded p-0.5">
                    <ChevronRight class="h-3.5 w-3.5 rotate-90" />
                  </div>
                </div>
                <div class="mt-0.5 flex flex-col gap-0.5 pl-3">
                  <div
                    class="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md text-primary bg-accent font-medium"
                  >
                    <span class="leading-none">💻</span>
                    <span>Frontend</span>
                  </div>
                  <div
                    class="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md text-muted-foreground"
                  >
                    <span class="leading-none">🔧</span>
                    <span>Backend</span>
                  </div>
                  <div
                    class="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md text-muted-foreground"
                  >
                    <span class="leading-none">🎨</span>
                    <span>Design</span>
                  </div>
                </div>
              </div>

              <div
                class="flex items-center px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-md"
              >
                Members
              </div>

              <div class="border-t border-border my-1" />

              <div
                class="flex items-center px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-md"
              >
                Workspaces
              </div>
              <div
                class="flex items-center px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-md"
              >
                Settings
              </div>
            </nav>

            <!-- User -->
            <div class="p-3 border-t border-border">
              <p class="text-xs text-muted-foreground truncate px-1">
                john@acme.com
              </p>
            </div>
          </div>

          <!-- Main content -->
          <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Project header -->
            <div class="px-4 pt-3 pb-2.5 border-b border-border">
              <h1
                class="text-sm font-bold text-primary flex items-center gap-1.5"
              >
                <span>💻</span> Frontend
              </h1>
              <p class="text-[11px] text-muted-foreground mt-0.5">
                Frontend development tasks and features
              </p>
            </div>

            <div class="px-4 py-2.5 space-y-2 border-b border-border">
              <!-- Section header -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold">Project Tasks</p>
                  <p class="text-[10px] text-muted-foreground">
                    8 tasks · <span class="text-red-500">2 urgent pending</span>
                  </p>
                </div>
                <div class="flex items-center gap-1.5">
                  <button
                    class="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border text-muted-foreground"
                  >
                    <RefreshCw class="h-2.5 w-2.5" /> Sync
                  </button>
                  <button
                    class="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground"
                  >
                    <Plus class="h-2.5 w-2.5" /> Add Task
                  </button>
                </div>
              </div>

              <!-- Filter bar -->
              <div class="flex items-center gap-2">
                <div
                  class="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1.5 flex-1"
                >
                  <Search class="h-3 w-3 text-muted-foreground shrink-0" />
                  <span class="text-[11px] text-muted-foreground"
                    >Search tasks…</span
                  >
                </div>
                <div
                  class="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground"
                >
                  <Users class="h-3 w-3" /> Members
                </div>
                <div
                  class="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground"
                >
                  Filters
                </div>
              </div>

              <!-- Status cards -->
              <div class="grid grid-cols-3 gap-2">
                <div
                  class="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-2.5 py-2"
                >
                  <div
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30"
                  >
                    <ListTodo
                      class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <div>
                    <p class="text-[11px] font-medium leading-tight">
                      All Tasks
                    </p>
                    <p class="text-[10px] text-muted-foreground">8 tarefas</p>
                  </div>
                </div>
                <div
                  class="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
                >
                  <div
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30"
                  >
                    <LoaderCircle
                      class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <div>
                    <p class="text-[11px] font-medium leading-tight">
                      In Progress
                    </p>
                    <p class="text-[10px] text-muted-foreground">2 tarefas</p>
                  </div>
                </div>
                <div
                  class="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
                >
                  <div
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30"
                  >
                    <CheckCircle2
                      class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <p class="text-[11px] font-medium leading-tight">
                      Completed
                    </p>
                    <p class="text-[10px] text-muted-foreground">3 tarefas</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Task list -->
            <div class="flex-1 overflow-y-auto p-3 space-y-2">
              <!-- Task 1: urgent + overdue -->
              <div
                class="rounded-lg border border-border bg-card p-3 flex items-start gap-2 hover:border-primary/40 transition-colors"
              >
                <div class="flex h-6 w-6 shrink-0 items-center justify-center">
                  <LoaderCircle
                    class="h-4 w-4 text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="mb-1 flex min-h-6 flex-wrap items-center gap-2">
                    <span class="text-sm font-medium"
                      >Fix auth token refresh bug</span
                    >
                    <span
                      class="priority-badge-urgent text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      >Urgent</span
                    >
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="flex items-center gap-1 text-red-500 text-xs">
                      <Clock class="h-3.5 w-3.5" />
                      Overdue Feb 18
                    </span>
                    <div class="flex -space-x-1.5">
                      <div
                        class="h-6 w-6 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-background"
                      >
                        A
                      </div>
                      <div
                        class="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-background"
                      >
                        B
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Task 2: important + completed -->
              <div
                class="rounded-lg border border-border bg-card p-3 flex items-start gap-2"
              >
                <div class="flex h-6 w-6 shrink-0 items-center justify-center">
                  <span
                    class="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500"
                  >
                    <Check class="size-3 text-white" />
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="mb-1 flex min-h-6 flex-wrap items-center gap-2">
                    <span
                      class="text-sm font-medium line-through text-muted-foreground opacity-70"
                      >Design new onboarding flow</span
                    >
                    <span
                      class="priority-badge-important text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      >Important</span
                    >
                  </div>
                  <div class="flex items-center justify-between">
                    <span
                      class="flex items-center gap-1 text-muted-foreground text-xs"
                    >
                      <Clock class="h-3.5 w-3.5" />
                      Due Feb 20
                    </span>
                    <div
                      class="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-background"
                    >
                      C
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
