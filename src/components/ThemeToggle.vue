<script setup lang="ts">
import { useColorMode } from "@vueuse/core";

const colorMode = useColorMode({ emitAuto: true });
const toggleDark = () => {
  if (colorMode.value == "light") colorMode.value = "dark";
  else if (colorMode.value == "dark") colorMode.value = "auto";
  else colorMode.value = "light";
};
</script>

<template>
  <span
    class="cursor-pointer"
    :title="
      colorMode == 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    "
    @click="toggleDark()"
  >
    <template v-if="colorMode == 'light'">
      <slot name="light" />
    </template>
    <template v-else-if="colorMode == 'dark'">
      <slot name="dark" />
    </template>
    <template v-else>
      <slot name="auto" />
    </template>
  </span>
</template>
