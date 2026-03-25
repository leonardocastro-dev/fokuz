<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

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

const scrollContainer = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
const stepEls = ref<HTMLElement[]>([])
const scrollProgress = ref(0)
const isPinned = ref(false)
const titleH = ref(0)
const timelineH = ref(0)
const headerH = ref(0)
const mobileActiveSteps = ref([false, false, false])
let stepObserver: IntersectionObserver | null = null

function update() {
  if (!scrollContainer.value) return

  if (titleRef.value) titleH.value = titleRef.value.offsetHeight
  if (timelineRef.value) timelineH.value = timelineRef.value.offsetHeight

  // Pinned mode only on lg+ where CSS sticky/h-screen is active
  const isLg = window.matchMedia('(min-width: 1024px)').matches

  if (!isLg) {
    isPinned.value = false
    return
  }

  // Measure sticky/fixed header (desktop only)
  const headers = document.querySelectorAll('header')
  headerH.value = 0
  headers.forEach((el) => {
    const style = window.getComputedStyle(el)
    if (
      (style.position === 'sticky' || style.position === 'fixed') &&
      style.display !== 'none'
    ) {
      headerH.value = Math.max(headerH.value, el.getBoundingClientRect().height)
    }
  })

  const scrollDistance =
    scrollContainer.value.offsetHeight - window.innerHeight

  if (scrollDistance <= 0) {
    isPinned.value = false
    return
  }

  isPinned.value = true
  const rect = scrollContainer.value.getBoundingClientRect()
  scrollProgress.value = Math.min(1, Math.max(0, -rect.top / scrollDistance))
}

// ── Phase 1 — Focus: title fades, timeline zooms & centers (0% → 18%) ──

const focusPhase = computed(() => {
  if (!isPinned.value) return 0
  const p = scrollProgress.value
  if (p > 0.18) return 1
  return p / 0.18
})

const titleOpacity = computed(() => {
  if (!isPinned.value) return 1
  return 1 - focusPhase.value
})

// Direct pixel position — no items-center guessing
const contentTopPx = computed(() => {
  if (!isPinned.value) return 0

  const vh = window.innerHeight
  const visibleCenter = headerH.value + (vh - headerH.value) / 2

  const t = titleH.value
  const tl = timelineH.value

  // Start: center title + timeline together in visible area
  const startTop = visibleCenter - (t + tl) / 2
  // End: center timeline only (title still in DOM but invisible)
  const endTop = visibleCenter - t - tl / 2

  return startTop + (endTop - startTop) * focusPhase.value
})

const timelineScale = computed(() => {
  if (!isPinned.value) return 1
  return 1 + 0.06 * focusPhase.value
})

// ── Phase 2 — Timeline scroll: line fills + steps activate (20% → 60%) ──

const timelineProgress = computed(() => {
  if (!isPinned.value) return 1
  const p = scrollProgress.value
  if (p < 0.2) return 0
  if (p > 0.6) return 1
  return (p - 0.2) / 0.4
})

const activeSteps = computed(() => {
  if (isPinned.value) {
    const p = scrollProgress.value
    return [p >= 0.24, p >= 0.38, p >= 0.52]
  }
  // Mobile/tablet: driven by IntersectionObserver
  return mobileActiveSteps.value
})

// ── Scroll handler ───────────────────────────────────────────────

let ticking = false
function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      update()
      ticking = false
    })
    ticking = true
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', update, { passive: true })
  update()

  // IntersectionObserver for mobile/tablet step reveals
  stepObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = stepEls.value.indexOf(entry.target as HTMLElement)
          if (index !== -1) {
            mobileActiveSteps.value = [...mobileActiveSteps.value]
            mobileActiveSteps.value[index] = true
          }
          stepObserver?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  )

  nextTick(() => {
    stepEls.value.forEach((el) => {
      if (el) stepObserver?.observe(el)
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', update)
  stepObserver?.disconnect()
  stepObserver = null
})
</script>

<template>
  <div ref="scrollContainer" class="relative lg:h-[350vh] lg:z-0">
    <section
      id="how-it-works"
      class="bg-gradient-subtle py-20 relative lg:sticky lg:top-0 lg:h-screen lg:py-0 lg:overflow-hidden"
    >
      <!-- Content — absolutely positioned on desktop for precise centering -->
      <div
        class="container mx-auto px-4 md:px-6 w-full lg:absolute lg:inset-x-0"
        :style="isPinned ? { top: `${contentTopPx}px` } : undefined"
      >
        <!-- Title — visible initially, fades out during Phase 1 -->
        <div
          ref="titleRef"
          class="text-center space-y-4 pb-10 lg:pb-14"
          :style="isPinned ? { opacity: titleOpacity } : undefined"
        >
          <h2
            class="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          >
            From zero to organised in
            <span class="bg-gradient-primary bg-clip-text text-transparent">
              three steps
            </span>
          </h2>
          <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
            A workflow designed for real teams, not solo to-do lists
          </p>
        </div>

        <!-- Timeline wrapper — zooms in for emphasis during Phase 1 -->
        <div
          ref="timelineRef"
          class="relative max-w-3xl mx-auto origin-center"
          :style="
            isPinned
              ? { transform: `scale(${timelineScale})` }
              : undefined
          "
        >
          <!-- Timeline track -->
          <div
            class="absolute left-[27px] lg:left-[35px] top-[28px] bottom-[28px] lg:top-[36px] lg:bottom-[36px] w-[3px] bg-border/50 rounded-full overflow-hidden"
          >
            <div
              class="absolute inset-x-0 top-0 bg-gradient-primary rounded-full origin-top"
              :style="{ height: `${timelineProgress * 100}%` }"
            />
          </div>

          <!-- Steps -->
          <div class="flex flex-col gap-8 lg:gap-14">
            <div
              v-for="(step, index) in steps"
              :key="step.number"
              :ref="(el: any) => { if (el?.$el || el) stepEls[index] = el.$el || el }"
              class="timeline-step flex gap-5 lg:gap-8 items-start"
              :class="{ 'is-active': activeSteps[index] }"
            >
              <!-- Node circle -->
              <div class="relative z-10 flex-shrink-0">
                <div
                  class="timeline-node w-[56px] h-[56px] lg:w-[72px] lg:h-[72px] rounded-full flex items-center justify-center text-xl lg:text-2xl font-black"
                  :class="
                    activeSteps[index]
                      ? 'bg-gradient-primary text-white shadow-lg shadow-primary/25 scale-100'
                      : 'bg-muted text-muted-foreground scale-[0.85]'
                  "
                >
                  {{ step.number }}
                </div>
              </div>

              <!-- Content -->
              <div class="timeline-content space-y-1 pt-1 lg:space-y-2 lg:pt-4">
                <h3 class="text-lg lg:text-xl font-bold text-foreground">
                  {{ step.title }}
                </h3>
                <p
                  class="text-sm lg:text-base text-muted-foreground leading-relaxed"
                >
                  {{ step.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  </div>
</template>

<style scoped>
.timeline-step .timeline-content {
  opacity: 0;
  transform: translateX(-16px);
  transition:
    opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.timeline-step.is-active .timeline-content {
  opacity: 1;
  transform: translateX(0);
}

.timeline-node {
  transition:
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.5s ease;
}

@media (prefers-reduced-motion: reduce) {
  .timeline-step .timeline-content {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .timeline-node {
    transition: none;
  }
}
</style>
