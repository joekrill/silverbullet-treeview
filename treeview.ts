import { asset, editor, system } from "@silverbulletmd/silverbullet/syscalls";
import { getPageTree } from "./api.ts";
import {
  getCustomStyles,
  getSizeOverride,
  isShowHidden,
  isTreeViewEnabled,
  PLUG_DISPLAY_NAME,
  PLUG_NAME,
  Position,
  setShowHidden,
  setSizeOverride,
  setTreeViewEnabled,
} from "./config.ts";
import { supportsPageRenaming } from "./compatability.ts";
import { getPlugConfig } from "./config.ts";

/**
 * Keeps track of the current rendered position of the treeview.
 */
let currentPosition: Position | undefined;

/**
 * Toggles the treeview and it's preferred state.
 */
export async function toggleTree() {
  const currentValue = await isTreeViewEnabled();
  if (!currentValue) {
    await showTree();
  } else {
    await hideTree();
  }
}

/**
 * Hides the treeview and sets it to disabled.
 */
export async function hideTree() {
  if (currentPosition) {
    await editor.hidePanel(currentPosition);
    currentPosition = undefined;
    await setTreeViewEnabled(false);
  }
}

/**
 * Shows the treeview only if it is currently enabled.
 */
export async function showTreeIfEnabled() {
  try {
    const env = await system.getEnv();
    if (env === "server") {
      return;
    }

    if (await isTreeViewEnabled()) {
      return await showTree();
    }
  } catch (err) {
    console.error(`${PLUG_DISPLAY_NAME}: showTreeIfEnabled failed`, err);
  }
}

/**
 * Shows the treeview and sets it to enabled.
 */
export async function showTree() {
  const config = await getPlugConfig();

  if (currentPosition && config.position !== currentPosition) {
    // This can be caused if the position preference in SETTINGS was changed
    // while the tree was visible. If we don't first hide the page tree,
    // we'll end up with multiple trees visible.
    await hideTree();
  }

  const showHidden = await isShowHidden();

  const [
    sortableTreeCss,
    sortableTreeJs,
    plugCss,
    plugJs,
    iconFolderMinus,
    iconFolderPlus,
    iconNavigation2,
    iconRefresh,
    iconXCircle,
    iconEye,
    iconEyeOff,
  ] = await Promise.all([
    asset.readAsset(PLUG_NAME, "assets/sortable-tree/sortable-tree.css"),
    asset.readAsset(PLUG_NAME, "assets/sortable-tree/sortable-tree.js"),
    asset.readAsset(PLUG_NAME, "assets/treeview.css"),
    asset.readAsset(PLUG_NAME, "assets/treeview.js"),
    asset.readAsset(PLUG_NAME, "assets/icons/folder-minus.svg"),
    asset.readAsset(PLUG_NAME, "assets/icons/folder-plus.svg"),
    asset.readAsset(PLUG_NAME, "assets/icons/navigation-2.svg"),
    asset.readAsset(PLUG_NAME, "assets/icons/refresh-cw.svg"),
    asset.readAsset(PLUG_NAME, "assets/icons/x-circle.svg"),
    asset.readAsset(PLUG_NAME, "assets/icons/eye.svg"),
    asset.readAsset(PLUG_NAME, "assets/icons/eye-off.svg"),
  ]);

  const { currentPage, nodes } = await getPageTree(config, showHidden);
  const customStyles = await getCustomStyles();

  const treeViewConfig = {
    nodes,
    currentPage,
    treeElementId: "treeview-tree",
    dragAndDrop: {
      ...config.dragAndDrop,
      enabled: config.dragAndDrop.enabled,
    },
    revealOnLoad: config.revealOnLoad,
  };

  const sizeOverride = await getSizeOverride();
  const size = sizeOverride ?? config.size;

  await editor.showPanel(
    config.position,
    size,
    `
      <link rel="stylesheet" href="/.client/main.css" />
      <style>
        ${sortableTreeCss}
        ${plugCss}
        ${customStyles ?? ""}
      </style>
      <div class="treeview-root">
        <div class="treeview-header">
          <div class="treeview-actions">
            <div class="treeview-actions-left">
              <button type="button" data-treeview-action="expand-all" title="Expand all">${iconFolderPlus}</button>
              <button type="button" data-treeview-action="collapse-all" title="Collapse all">${iconFolderMinus}</button>
              <button type="button" data-treeview-action="reveal-current-page" title="Reveal current page">${iconNavigation2}</button>
              <button type="button" data-treeview-action="refresh" title="Refresh treeview">${iconRefresh}</button>
              <button type="button" data-treeview-action="toggle-hidden" title="${showHidden ? "Hide excluded files" : "Show excluded files"}">${showHidden ? iconEye : iconEyeOff}</button>
              <button type="button" data-treeview-action="decrease-width" title="Decrease width">&gt;-&lt;</button>
              <button type="button" data-treeview-action="increase-width" title="Increase width">&lt;-&gt;</button>
            </div>
            <div class="treeview-actions-right">
              <button type="button" data-treeview-action="close-panel" title="Close tree">${iconXCircle}</button>
            </div>
          </div>
        </div>
        <div id="${treeViewConfig.treeElementId}"></div>
      </div>`,
    `
      ${sortableTreeJs}
      ${plugJs}
      initializeTreeViewPanel(${JSON.stringify(treeViewConfig)});
    `,
  );

  await setTreeViewEnabled(true);
  currentPosition = config.position;
}

/**
 * Toggles visibility of excluded (hidden) files.
 */
export async function toggleHidden() {
  const current = await isShowHidden();
  await setShowHidden(!current);
  await showTree();
}

/**
 * Invokes the built-in delete page command.
 */
export async function deletePage() {
  await system.invokeCommand("Page: Delete");
}

const SIZE_STEP = 0.1;

/**
 * Increases the treeview width.
 */
export async function increaseWidth() {
  const config = await getPlugConfig();
  const current = (await getSizeOverride()) ?? config.size;
  await setSizeOverride(current + SIZE_STEP);
  await showTree();
}

/**
 * Decreases the treeview width.
 */
export async function decreaseWidth() {
  const config = await getPlugConfig();
  const current = (await getSizeOverride()) ?? config.size;
  const newSize = Math.max(0.1, current - SIZE_STEP);
  await setSizeOverride(newSize);
  await showTree();
}
