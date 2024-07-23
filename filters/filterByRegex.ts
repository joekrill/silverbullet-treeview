import { PageMeta } from "$sb/types.ts";
import { z } from "zod";
import { exclusionRuleByRegexSchema, PLUG_DISPLAY_NAME } from "../config.ts";

export type FilterPagesByRegexOptions = z.infer<
  typeof exclusionRuleByRegexSchema
>;

export const filterPagesByRegex = (
  pages: PageMeta[],
  { rule, negate }: Omit<FilterPagesByRegexOptions, "type">,
) => {
  try {
    const regexFilter = new RegExp(rule);
    return pages.filter(({ name }) => (regexFilter.test(name) === negate));
  } catch (err: unknown) {
    console.error(
      `${PLUG_DISPLAY_NAME}: filtering pages by regex "${rule}" failed`,
      err,
    );
    return pages;
  }
};
