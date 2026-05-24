import { PresentationIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

import { imageWithAlt } from "./shared";

export const caseStudy = defineType({
  name: "caseStudy",
  title: "Case study",
  type: "document",
  icon: PresentationIcon,
  fields: [
    defineField({
      name: "restaurantName",
      title: "Restaurant name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "restaurantType",
      title: "Restaurant type",
      type: "string",
    }),
    defineField({
      name: "result",
      title: "Result",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    imageWithAlt,
    defineField({
      name: "summary",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    select: {
      title: "restaurantName",
      subtitle: "result",
      media: "image",
    },
  },
});
