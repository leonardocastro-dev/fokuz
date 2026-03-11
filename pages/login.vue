<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useAuth } from '@/composables/useAuth'
import { watch } from 'vue'

const route = useRoute()
const { user, login, loading } = useAuth()

watch(
  [() => user.value, () => loading.value],
  ([newUser, isLoading]) => {
    if (newUser && !isLoading) {
      const redirect = route.query.redirect as string
      navigateTo(redirect || '/workspaces')
    }
  },
  { immediate: true }
)

const loginSchema = toTypedSchema(
  z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    password: z.string().min(1, 'Password is required')
  })
)

const { isFieldDirty, handleSubmit } = useForm({
  validationSchema: loginSchema
})

const onSubmit = handleSubmit(async (data) => {
  await login(data.email, data.password)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <Card>
        <CardHeader class="space-y-1">
          <CardTitle class="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription class="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form class="space-y-4" @submit="onSubmit">
            <FormField
              v-slot="{ componentField }"
              name="email"
              :validate-on-blur="!isFieldDirty"
            >
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    type="email"
                    placeholder="your@email.com"
                    :disabled="loading"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField
              v-slot="{ componentField }"
              name="password"
              :validate-on-blur="!isFieldDirty"
            >
              <FormItem>
                <div class="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    class="h-auto p-0 text-xs"
                    :disabled="loading"
                    @click="navigateTo('/forgot-password')"
                  >
                    Forgot password?
                  </Button>
                </div>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    type="password"
                    placeholder="******"
                    :disabled="loading"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <Button type="submit" class="w-full" :disabled="loading">
              {{ loading ? 'Loading...' : 'Login' }}
            </Button>
          </form>
        </CardContent>

        <CardFooter class="flex justify-center">
          <Button variant="link" @click="navigateTo('/workspaces')">
            Continue as guest
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
