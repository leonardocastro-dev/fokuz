<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { doc, updateDoc } from 'firebase/firestore'
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'vue-sonner'
import { Upload, Loader2, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  username: string
  avatarUrl: string
}>()

const emit = defineEmits<{
  'update:username': [value: string]
  'update:avatarUrl': [value: string]
}>()

const { user } = useAuth()

const localUsername = ref(props.username)
const isUpdatingProfile = ref(false)
const isUploadingAvatar = ref(false)
const isRemovingAvatar = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Sync with parent
watch(
  () => props.username,
  (val) => {
    localUsername.value = val
  }
)

const updateUsername = async () => {
  if (!user.value || !localUsername.value) {
    toast.error('Username is required', {
      style: { background: '#fda4af' },
      duration: 3000
    })
    return
  }

  try {
    isUpdatingProfile.value = true
    const { $firestore } = useNuxtApp()

    const publicRef = doc($firestore, 'users', user.value.uid)
    await updateDoc(publicRef, { username: localUsername.value })

    emit('update:username', localUsername.value)

    toast.success('Username updated successfully', {
      style: { background: '#6ee7b7' },
      duration: 3000
    })
  } catch (error) {
    console.error('Error updating username:', error)
    toast.error('Failed to update username', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isUpdatingProfile.value = false
  }
}

const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file || !user.value) return

  if (!file.type.startsWith('image/')) {
    toast.error('Please select an image file', {
      style: { background: '#fda4af' },
      duration: 3000
    })
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.error('Image must be less than 2MB', {
      style: { background: '#fda4af' },
      duration: 3000
    })
    return
  }

  try {
    isUploadingAvatar.value = true
    const { $storage, $firestore } = useNuxtApp()

    const avatarRef = storageRef(
      $storage,
      `avatars/${user.value.uid}/${Date.now()}_${file.name}`
    )
    await uploadBytes(avatarRef, file)
    const downloadUrl = await getDownloadURL(avatarRef)

    const publicRef = doc($firestore, 'users', user.value.uid)
    await updateDoc(publicRef, { avatarUrl: downloadUrl })

    emit('update:avatarUrl', downloadUrl)

    toast.success('Avatar updated successfully', {
      style: { background: '#6ee7b7' },
      duration: 3000
    })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    toast.error('Failed to upload avatar', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isUploadingAvatar.value = false
  }
}

const removeAvatar = async () => {
  if (!user.value || !props.avatarUrl) return

  try {
    isRemovingAvatar.value = true
    const { $storage, $firestore } = useNuxtApp()

    try {
      const avatarRef = storageRef($storage, props.avatarUrl)
      await deleteObject(avatarRef)
    } catch (error: unknown) {
      const storageError = error as { code?: string }
      if (storageError.code !== 'storage/object-not-found') {
        throw error
      }
    }

    const publicRef = doc($firestore, 'users', user.value.uid)
    await updateDoc(publicRef, { avatarUrl: '' })

    emit('update:avatarUrl', '')

    toast.success('Avatar removed successfully', {
      style: { background: '#6ee7b7' },
      duration: 3000
    })
  } catch (error) {
    console.error('Error removing avatar:', error)
    toast.error('Failed to remove avatar', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isRemovingAvatar.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Profile Information</CardTitle>
      <CardDescription
        >Update your username and profile picture</CardDescription
      >
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="flex flex-col sm:flex-row gap-6">
        <div class="relative">
          <Avatar :uid="user?.uid" class="h-24 w-24">
            <AvatarImage :src="avatarUrl" alt="Profile picture" />
            <AvatarFallback class="text-2xl">
              {{ localUsername.charAt(0).toUpperCase() || 'U' }}
            </AvatarFallback>
          </Avatar>
          <div
            v-if="isUploadingAvatar || isRemovingAvatar"
            class="absolute flex items-center justify-center bg-muted bottom-0 right-0 h-8 w-8 rounded-full"
          >
            <Loader2 class="animate-spin text-primary" />
          </div>
        </div>
        <div class="flex-1">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleAvatarUpload"
          />
          <div class="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              :disabled="isUploadingAvatar || isRemovingAvatar"
              class="flex items-center gap-2"
              @click="fileInput?.click()"
            >
              <Upload class="h-4 w-4" />
              {{ isUploadingAvatar ? 'Uploading...' : 'Upload New Photo' }}
            </Button>
            <Button
              variant="outline"
              :disabled="isUploadingAvatar || isRemovingAvatar || !avatarUrl"
              class="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/20"
              @click="removeAvatar"
            >
              <Trash2 class="h-4 w-4 text-destructive/50" />
              {{ isRemovingAvatar ? 'Removing...' : 'Remove Photo' }}
            </Button>
          </div>
          <p class="text-sm text-muted-foreground mt-2">
            JPG, PNG or GIF. Max size 2MB.
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <Label for="username">Username</Label>
        <div class="flex gap-2">
          <Input
            id="username"
            v-model="localUsername"
            placeholder="Enter your username"
            :disabled="isUpdatingProfile"
          />
          <Button
            :disabled="isUpdatingProfile || !localUsername"
            @click="updateUsername"
          >
            {{ isUpdatingProfile ? 'Saving...' : 'Save' }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
