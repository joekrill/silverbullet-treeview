import { PageMeta } from "@silverbulletmd/silverbullet/types";
import { z } from "zod";
import { exclusionRuleByFunctionSchema, PLUG_DISPLAY_NAME } from "../config.ts";
import { system } from "@silverbulletmd/silverbullet/syscalls";

export type FilterPagesByFunctionOptions = z.infer<
  typeof exclusionRuleByFunctionSchema
>;

export const filterPagesByFunction = async (
  pages: PageMeta[],
  { name, negate }: Omit<FilterPagesByFunctionOptions, "type">,
) => {
  try {
    const results = await Promise.all(
      pages.map((page) => system.invokeSpaceFunction(name, page)),
    );

    return pages.filter((_, index) =>
      negate ? results[index] : !results[index]
    );
  } catch (err: unknown) {
    console.error(
      `${PLUG_DISPLAY_NAME}: filtering pages by function "${name}" failed`,
      err,
    );
    return pages;
  }
};
