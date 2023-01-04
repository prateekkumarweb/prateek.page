import { defineConfig } from "astro/config";
import { execSync } from "node:child_process";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import icons from "unplugin-icons/vite";
import emoji from "remark-gemoji";
import math from "remark-math";
import mathjax from "rehype-mathjax";
import image from "@astrojs/image";
import sitemap from "@astrojs/sitemap";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

// https://astro.build/config
export default defineConfig({
  site: "https://prateek.page",
  trailingSlash: "always",
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
    mdx(),
    image({
      serviceEntryPoint: "@astrojs/image/sharp",
    }),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [emoji, math],
    rehypePlugins: [mathjax],
    extendDefaultPlugins: true,
  },
});
