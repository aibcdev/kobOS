import { defineField } from "sanity";

export const seoFields = [
  defineField({
    name: "seoTitle",
    title: "SEO title",
    type: "string",
    validation: (rule) => rule.max(70),
  }),
  defineField({
    name: "seoDescription",
    title: "SEO description",
    type: "text",
    rows: 3,
    validation: (rule) => rule.max(160),
  }),
];

export const imageWithAlt = defineField({
  name: "image",
  title: "Image",
  type: "image",
  options: {
    hotspot: true,
  },
  fields: [
    defineField({
      name: "alt",
      title: "Alternative text",
      type: "string",
      validation: (rule) => rule.required().warning("Alt text helps SEO and accessibility."),
    }),
  ],
});
