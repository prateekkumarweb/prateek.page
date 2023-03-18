import { defineCollection, z } from "astro:content";

const postCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.date(),
    image: z.string().optional(),
    tags: z.array(z.string()),
    math: z.boolean().optional(),
  }),
});

export const collections = {
  post: postCollection,
};
