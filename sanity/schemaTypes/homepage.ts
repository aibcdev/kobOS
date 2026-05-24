import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

import { imageWithAlt, seoFields } from "./shared";

export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "title",
      title: "Internal title",
      type: "string",
      initialValue: "KOB homepage",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "hero",
      title: "Hero",
      type: "object",
      fields: [
        defineField({
          name: "eyebrow",
          title: "Eyebrow",
          type: "string",
          description: "Small label above the headline (e.g. product category).",
        }),
        defineField({
          name: "headline",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "headlineEmphasis",
          title: "Headline accent line",
          type: "string",
          description: "Optional second line styled as accent beneath the main headline.",
        }),
        defineField({
          name: "subheadline",
          type: "text",
          rows: 3,
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "primaryCta",
          title: "Primary CTA",
          type: "string",
        }),
        defineField({
          name: "primaryCtaUrl",
          title: "Primary CTA URL",
          type: "string",
          description: "Absolute or site path for the primary button.",
        }),
        defineField({
          name: "secondaryCta",
          title: "Secondary CTA",
          type: "string",
        }),
        defineField({
          name: "secondaryCtaUrl",
          title: "Secondary CTA URL",
          type: "string",
        }),
        defineField({
          name: "tertiaryCta",
          title: "Tertiary CTA label",
          type: "string",
        }),
        defineField({
          name: "tertiaryCtaUrl",
          title: "Tertiary CTA URL",
          type: "string",
        }),
        imageWithAlt,
      ],
    }),
    defineField({
      name: "trustItems",
      title: "Trust items",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "features",
      title: "Features",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "title",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "copy",
              type: "text",
              rows: 3,
              validation: (rule) => rule.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "caseStudies",
      title: "Case studies",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "caseStudy" }] })],
    }),
    defineField({
      name: "testimonials",
      title: "Testimonials",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "testimonial" }] })],
    }),
    ...seoFields,
  ],
  preview: {
    select: {
      title: "title",
    },
  },
});
