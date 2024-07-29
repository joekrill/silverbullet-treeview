import { clientStore, editor } from "$sb/syscalls.ts";
import { readSetting } from "$sb/lib/settings_page.ts";
import { z, ZodError } from "zod";

/**
 * The name of this plug.
 * TODO: is there a way to get this programatically?
 */
export const PLUG_NAME = "treeview";

export const PLUG_DISPLAY_NAME = "TreeView Plug";

/**
 * The key used to save the current enabled state of the treeview.
 */
const ENABLED_STATE_KEY = "enableTreeView";

/**
 * The possible position where the treeview can be rendered.
 */
const POSITIONS = ["rhs", "lhs", "bhs", "modal"] as const;

export type Position = typeof POSITIONS[number];

/**
 * Defines an exclusion rule based on a regular expression
 */
export const exclusionRuleByRegexSchema = z.object({
  type: z.literal("regex"),
  rule: z.string(),
  negate: z.boolean().optional().default(false),
});

/**
 * Defines an exclusion rule based on a list of tags
 */
export const exclusionRuleByTagsSchema = z.object({
  type: z.literal("tags"),
  tags: z.array(z.string()),
  negate: z.boolean().optional().default(false),
  attribute: z.enum(["tags", "itags", "tag"]).optional().default("tags"),
});

/**
 * Defines an exclusion rule based on a regular expression
 */
export const exclusionRuleByFunctionSchema = z.object({
  type: z.literal("space-function"),
  name: z.string(),
  negate: z.boolean().optional().default(false),
});

/**
 * The schema for the tree view configuration read from the SETTINGS page.
 */
const treeViewConfigSchema = z.object({
  /**
   * Where to position the tree view in the UI.
   */
  position: z.enum(POSITIONS).optional().default("lhs"),

  /**
   * The size of the treeview pane.
   */
  size: z.number().gt(0).optional().default(1),

  /**
   * Drag-and-drop options
   */
  dragAndDrop: z.object({
    /**
     * Whether dragging/dropping functionality is
     */
    enabled: z.boolean().optional().default(true),
    /**
     * True to confirm on rename actions by showing a popup prompt.
     */
    confirmOnRename: z.boolean().optional().default(true),
  }).optional().default({}),

  /**
   * @deprecated
   */
  pageExcludeRegex: z.string().optional().default(""),

  /**
   * A list of exclusion rules to apply.
   */
  exclusions: z.array(z.discriminatedUnion("type", [
    exclusionRuleByRegexSchema,
    exclusionRuleByTagsSchema,
    exclusionRuleByFunctionSchema,
  ])).optional(),
});

export type TreeViewConfig = z.infer<typeof treeViewConfigSchema>;

async function showConfigErrorNotification(error: unknown) {
  if (configErrorShown) {
    return;
  }

  configErrorShown = true;
  let errorMessage = `${typeof error}: ${String(error)}`;

  if (error instanceof ZodError) {
    const { formErrors, fieldErrors } = error.flatten();
    const fieldErrorMessages = Object.keys(fieldErrors).map((field) =>
      `\`${field}\` - ${fieldErrors[field]!.join(", ")}`
    );

    // Not pretty, but we don't have any formatting options available here.
    errorMessage = [...formErrors, ...fieldErrorMessages].join("; ");
  }

  // Some rudimentary notification about an invalid configuration.
  // Not pretty, but we can't use html/formatting here.
  await editor.flashNotification(
    `There was an error with your ${PLUG_NAME} configuration. Check your SETTINGS file: ${errorMessage}`,
    "error",
  );
}

let configErrorShown = false;

export async function getPlugConfig(): Promise<TreeViewConfig> {
  const userConfig = await readSetting(PLUG_NAME);

  try {
    return treeViewConfigSchema.parse(userConfig || {});
  } catch (_err) {
    if (!configErrorShown) {
      showConfigErrorNotification(_err);
      configErrorShown = true;
    }
    // Fallback to the default configuration
    return treeViewConfigSchema.parse({});
  }
}

export async function isTreeViewEnabled() {
  return !!(await clientStore.get(ENABLED_STATE_KEY));
}

export async function setTreeViewEnabled(value: boolean) {
  return await clientStore.set(ENABLED_STATE_KEY, value);
}

export async function getCustomStyles() {
  const customStyles = await editor.getUiOption("customStyles") as
    | string
    | undefined;
  return customStyles;
}
