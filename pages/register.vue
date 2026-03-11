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
const { user, register, loading } = useAuth()

// Redirect if already logged in
watch(
  () => user.value,
  (newUser) => {
    if (newUser && !loading.value) {
      const redirect = route.query.redirect as string
      navigateTo(redirect || '/workspaces')
    }
  },
  { immediate: true }
)

const registerSchema = toTypedSchema(
  z
    .object({
      username: z
        .string()
        .min(1, 'Username is required')
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must not exceed 20 characters')
        .regex(
          /^[a-zA-Z0-9_]+$/,
          'Username can only contain letters, numbers, and underscores'
        )
        .refine((val) => !val.includes(' '), 'Username cannot contain spaces'),
      email: z.string().min(1, 'Email is required').email('Invalid email'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string().min(1, 'Confirm your password')
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'The passwords do not match',
      path: ['confirmPassword']
    })
)

const { isFieldDirty, handleSubmit } = useForm({
  validationSchema: registerSchema
})

const onSubmit = handleSubmit(async (data) => {
  await register(data.username, data.email, data.password)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <Card>
        <CardHeader class="space-y-1">
          <CardTitle class="text-2xl font-bold text-center">Register</CardTitle>
          <CardDescription class="text-center">
            Register to manage your tasks
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form class="space-y-4" @submit="onSubmit">
            <FormField
              v-slot="{ componentField }"
              name="username"
              :validate-on-blur="!isFieldDirty"
            >
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    type="text"
                    placeholder="johndoe123"
                    :disabled="loading"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

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
                <FormLabel>Password</FormLabel>
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

            <FormField
              v-slot="{ componentField }"
              name="confirmPassword"
              :validate-on-blur="!isFieldDirty"
            >
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
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
              {{ loading ? 'Loading...' : 'Register' }}
            </Button>
          </form>
        </CardContent>

        <CardFooter class="flex flex-col space-y-2">
          <div class="text-sm text-center text-muted-foreground">
            Already have an account?
          </div>
          <Button
            variant="outline"
            class="w-full"
            @click="
              navigateTo(
                route.query.redirect
                  ? `/login?redirect=${route.query.redirect}`
                  : '/login'
              )
            "
          >
            Login
          </Button>
          <Button variant="link" @click="navigateTo('/workspaces')">
            Continue as guest
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
