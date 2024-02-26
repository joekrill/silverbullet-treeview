import { asset, editor } from "$sb/syscalls.ts";
import { getPageTree } from "./api.ts";
import {
  getCustomStyles,
  isTreeViewEnabled,
  PLUG_NAME,
  Position,
  setTreeViewEnabled,
} from "./config.ts";
import { supportsPageRenaming } from "./compatability.ts";
import { getPlugConfig } from "./config.ts";
import { getSilverBulletTheme } from "./config.ts";

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
  if (await isTreeViewEnabled()) {
    return await showTree();
  }
}

/**
 * Shows the treeview and sets it to enabled.
 */
export async function showTree() {
  const theme = await getSilverBulletTheme();
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

  const { currentPage, nodes } = await getPageTree();
  const customStyles = await getCustomStyles();

  const treeViewConfig = {
    nodes,
    currentPage,
    treeElementId: "treeview-tree",
    dragAndDrop: {
      ...config.dragAndDrop,
      enabled: config.dragAndDrop.enabled && await supportsPageRenaming(),
    },
  };

  await editor.showPanel(
    config.position,
    config.size,
    `
      <html>
      <head>
        <link rel="stylesheet" href="/.client/main.css" />
        <style>
          ${sortableTreeCss} 
          ${plugCss}
          ${customStyles ?? ""}
        </style>
      </head>
      <body>
        <div class="treeview-root">
          <div class="treeview-header">
            <div class="treeview-actions">
              <button type="button" data-treeview-action="expand-all" title="Expand all">${iconFolderPlus}</button>
              <button type="button" data-treeview-action="collapse-all" title="Collapse all">${iconFolderMinus}</button>
              <button type="button" data-treeview-action="reveal-current-page" title="Reveal current page">${iconNavigation2}</button>
              <button type="button" data-treeview-action="refresh" title="Refresh treeview">${iconRefresh}</button>
              <div class="spacer"></div>
              <button type="button" data-treeview-action="close-panel" title="Close tree">${iconXCircle}</button>
            </div>
          </div>
          <div id="${treeViewConfig.treeElementId}"></div>
        </div>
      </body>
      </html>`,
    `
      // Workaound until showPanel provides the current theme 
      document.documentElement.dataset.theme = ${JSON.stringify(theme)};

      ${sortableTreeJs}
      ${plugJs}

      initializeTreeViewPanel(${JSON.stringify(treeViewConfig)});
    `,
  );

  await setTreeViewEnabled(true);
  currentPosition = config.position;
}
