<script setup lang="ts">
import { useColorMode } from "@vueuse/core";

const colorMode = useColorMode({ emitAuto: true });
</script>

<template>
  <div
    class="inline-flex gap-1 border rounded-full border-gray-400 dark:border-gray-500 text-sm bg-gray-300 dark:bg-gray-600 p-[4px]"
    :title="
      colorMode == 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    "
  >
    <button
      class="w-8 h-8"
      :class="colorMode == 'light' ? 'selected' : ''"
      @click="colorMode = 'light'"
    >
      <slot name="light" />
    </button>
    <button
      class="w-8 h-8"
      :class="colorMode == 'dark' ? 'selected' : ''"
      @click="colorMode = 'dark'"
    >
      <slot name="dark" />
    </button>
    <button
      class="w-8 h-8"
      :class="colorMode == 'auto' ? 'selected' : ''"
      @click="colorMode = 'auto'"
    >
      <slot name="auto" />
    </button>
  </div>
</template>

<style scoped>
.selected {
  @apply bg-gray-100 rounded-full dark:bg-gray-800;
}
</style>
