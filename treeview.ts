import { asset, editor, system } from "$sb/syscalls.ts";
import { getPageTree, TreeShortcutPagesType } from "./api.ts";
import {
  getCustomStyles,
  isTreeViewEnabled,
  PLUG_DISPLAY_NAME,
  PLUG_NAME,
  Position,
  setTreeViewEnabled,
} from "./config.ts";
import { supportsPageRenaming } from "./compatability.ts";
import { getPlugConfig } from "./config.ts";

/**
 * Keeps track of the current rendered position of the treeview.
 */
let currentPosition: Position | undefined;
let treeShortcuts: TreeShortcutPagesType | undefined;


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
 * Navigate to next node in tree.
 */
export async function navigateToNextNode() {
  if (treeShortcuts)
  {
    await editor.navigate(treeShortcuts.nextPage, false, false);
  }
}

/**
 * Navigate to prev node in tree.
 */
export async function navigateToPrevNode() {
  if (treeShortcuts)
  {
    await editor.navigate(treeShortcuts.prevPage, false, false);
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
  ]);

  const {nodes, currentPage, treeShortcutPages} = await getPageTree(config);
  treeShortcuts = treeShortcutPages;

  const customStyles = await getCustomStyles();

  const treeViewConfig = {
    nodes,
    currentPage,
    treeElementId: "treeview-tree",
    expandAllAtInit: config.expandAllAtInit,
    dragAndDrop: {
      ...config.dragAndDrop,
      enabled: config.dragAndDrop.enabled && await supportsPageRenaming(),
    },
  };

  await editor.showPanel(
    config.position,
    config.size,
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
