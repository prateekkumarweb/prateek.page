import { defineConfig } from "astro/config";
import { execSync } from "node:child_process";
import mdx from "@astrojs/mdx";
import icons from "unplugin-icons/vite";
import emoji from "remark-gemoji";
import math from "remark-math";
import mathjax from "rehype-mathjax";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

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
        defaultClass: "icon",
      }),
      tailwindcss(),
    ],
  },
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [emoji, math],
    rehypePlugins: [mathjax],
  },
});
