<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits
} from 'reka-ui'
import { cn } from '@/lib/utils'
import SheetOverlay from './SheetOverlay.vue'

interface SheetContentProps extends DialogContentProps {
  class?: HTMLAttributes['class']
  side?: 'top' | 'right' | 'bottom' | 'left'
}

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<SheetContentProps>(), {
  side: 'right'
})
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'side')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <SheetOverlay />
    <DialogContent
      data-slot="sheet-content"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-0 h-full w-full md:inset-auto md:right-4 md:top-4 md:bottom-4 md:h-[calc(100vh-2rem)] md:w-3/4 md:rounded-2xl md:max-w-sm',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          props.class
        )
      "
      v-bind="{ ...$attrs, ...forwarded }"
    >
      <div
        class="flex items-center justify-end gap-2 px-5 py-3 shrink-0 border-b"
      >
        <slot name="header-actions" />
        <DialogClose
          class="outline-none data-[state=open]:bg-secondary rounded-xs opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none"
        >
          <X class="size-5 cursor-pointer" />
          <span class="sr-only">Close</span>
        </DialogClose>
      </div>

      <div class="flex-1 overflow-y-auto py-5">
        <slot />
      </div>
    </DialogContent>
  </DialogPortal>
</template>
