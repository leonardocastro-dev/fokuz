<script setup lang="ts">
import { cn } from '@/lib/utils'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogPortal,
  useForwardPropsEmits
} from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import DialogOverlay from './DialogOverlay.vue'

const props = withDefaults(
  defineProps<
    DialogContentProps & { class?: HTMLAttributes['class']; canClose?: boolean }
  >(),
  {
    canClose: true
  }
)
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, canClose: __, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      v-bind="forwarded"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed z-50 flex flex-col w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] border shadow-lg duration-200 rounded-2xl',
          'top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]',
          'sm:max-w-lg',
          props.class
        )
      "
    >
      <div class="flex items-center justify-end gap-2 px-5 py-3 shrink-0 border-b">
        <slot name="header-actions" />
        <DialogClose
          :class="
            cn(
              'outline-none data-[state=open]:bg-secondary rounded-xs opacity-70 transition-opacity disabled:pointer-events-none',
              canClose
                ? 'cursor-pointer hover:opacity-100'
                : 'opacity-30 pointer-events-none'
            )
          "
        >
          <X class="sm:size-5 size-6" />
          <span class="sr-only">Close</span>
        </DialogClose>
      </div>

      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>
    </DialogContent>
  </DialogPortal>
</template>
