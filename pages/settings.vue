<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { doc, getDoc } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'vue-sonner'
import { ArrowLeft } from 'lucide-vue-next'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ProfileTab from '@/components/settings/ProfileTab.vue'
import EmailTab from '@/components/settings/EmailTab.vue'
import PasswordTab from '@/components/settings/PasswordTab.vue'

const { user } = useAuth()
const router = useRouter()
const route = useRoute()

const fromWorkspace = ref<string | null>(null)

const backPath = computed(() => {
  if (fromWorkspace.value) {
    return `/${fromWorkspace.value}/projects`
  }
  return '/workspaces'
})

const backLabel = computed(() => {
  if (fromWorkspace.value) {
    return 'Back to Projects'
  }
  return 'Back to Workspaces'
})

// User data
const username = ref('')
const email = ref('')
const avatarUrl = ref('')

// Loading state
const isLoading = ref(true)

const loadUserData = async () => {
  if (!user.value) return

  try {
    isLoading.value = true
    const { $firestore } = useNuxtApp()

    // Load public data
    const publicRef = doc($firestore, 'users', user.value.uid)
    const publicSnap = await getDoc(publicRef)

    if (publicSnap.exists()) {
      const publicData = publicSnap.data()
      username.value = publicData.username || ''
      avatarUrl.value = publicData.avatarUrl || ''
    }

    // Load private data
    const privateRef = doc($firestore, 'users_private', user.value.uid)
    const privateSnap = await getDoc(privateRef)

    if (privateSnap.exists()) {
      const privateData = privateSnap.data()
      email.value = privateData.email || user.value.email || ''
    }
  } catch (error) {
    console.error('Error loading user data:', error)
    toast.error('Failed to load user data', {
      style: { background: '#fda4af' },
      duration: 3000
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (!user.value) {
    router.push('/login')
  } else {
    // Check if user came from a workspace
    const from = route.query.from as string | undefined
    if (from) {
      fromWorkspace.value = from
    }
    loadUserData()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
      <header class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            class="flex items-center gap-1"
            @click="router.push(backPath)"
          >
            <ArrowLeft class="h-4 w-4" />
            <span>{{ backLabel }}</span>
          </Button>
        </div>

        <div>
          <h1 class="text-3xl font-bold text-primary mb-2">Account Settings</h1>
          <p class="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>
      </header>

      <div v-if="isLoading" class="flex justify-center py-12">
        <LoadingSpinner />
      </div>

      <Tabs v-else default-value="profile" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab
            :username="username"
            :avatar-url="avatarUrl"
            @update:username="username = $event"
            @update:avatar-url="avatarUrl = $event"
          />
        </TabsContent>

        <TabsContent value="email">
          <EmailTab :email="email" @update:email="email = $event" />
        </TabsContent>

        <TabsContent value="password">
          <PasswordTab />
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>
