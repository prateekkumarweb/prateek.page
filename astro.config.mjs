import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import vue from "@astrojs/vue";
import mdx from "@astrojs/mdx";
import icons from "unplugin-icons/vite";
import emoji from "remark-gemoji";
import math from "remark-math";
import mathjax from "rehype-mathjax";
import { execSync } from "node:child_process";
import image from "@astrojs/image";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

// https://astro.build/config
export default defineConfig({
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(commitHash),
    },
    plugins: [
      icons({
        compiler: "astro",
      }),
    ],
  },
  integrations: [
    tailwind(),
    vue(),
    mdx(),
    image({
      serviceEntryPoint: "@astrojs/image/sharp",
    }),
  ],
  markdown: {
    remarkPlugins: [emoji, math],
    rehypePlugins: [mathjax],
    extendDefaultPlugins: true,
  },
});
