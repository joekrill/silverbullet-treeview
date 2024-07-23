import { z } from "zod";
import { exclusionRuleByTagsSchema } from "../config.ts";
import { PageMeta } from "$sb/types.ts";

export type FilterPagesByTagsOptions = z.infer<
  typeof exclusionRuleByTagsSchema
>;

export const filterPagesByTags = (
  pages: PageMeta[],
  { attribute, negate, tags }: Omit<FilterPagesByTagsOptions, "type">,
) =>
  pages.filter((page) => {
    const value = page[attribute];

    const hasTag = value !== undefined &&
      (Array.isArray(value)
        ? value.some((tag) => tags.includes(tag))
        : tags.includes(value));

    return negate ? hasTag : !hasTag;
  });
