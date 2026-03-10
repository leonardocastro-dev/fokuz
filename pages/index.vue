<script setup lang="ts">
import Hero from '@/components/home/Hero.vue'
import Header from '@/components/home/Header.vue'
import Features from '@/components/home/Features.vue'
import Benefits from '@/components/home/Benefits.vue'
import CTA from '@/components/home/CTA.vue'
import Footer from '@/components/home/Footer.vue'
import SocialProof from '@/components/home/SocialProof.vue'
import ProductMockup from '@/components/home/ProductMockup.vue'
import HowItWorks from '@/components/home/HowItWorks.vue'
import Permissions from '@/components/home/Permissions.vue'
import { useScrollReveal } from '@/composables/useScrollReveal'

useScrollReveal()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <Header />
    <main class="flex-1 pt-16 md:pt-0">
      <Hero />
      <SocialProof />
      <ProductMockup />
      <Features />
      <HowItWorks />
      <Permissions />
      <Benefits />
      <CTA />
    </main>
    <Footer />
  </div>
</template>
