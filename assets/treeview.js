/**
 * @typedef {import("../api.ts").TreeNode} TreeNode
 */

/**
 * @typedef SortableTreeNode
 * @type {Object}
 * @property {TreeNode["data"]} data
 */

/**
 *
 * @typedef TreeViewConfig
 * @type {Object}
 * @property {string} currentPage - the current page shown in SilverBullet.
 * @property {TreeNode[]} nodes - a tree of all pages in the current space.
 * @property {Object} dragAndDrop - drag and drop related config
 * @property {boolean} dragAndDrop.enabled - true if drag and drop is enabled
 * @property {boolean} dragAndDrop.confirmOnRename - true if a confirmation should be shown
 *  when a node is dragged and dropped.
*/


const TREE_STATE_ID = "treeview";

/**
 * Initializes the TreeView's `SortableTree` instance.
 * @param {TreeViewConfig} config
 * @returns {SortableTree}
 */
function createTreeView(config) {
  return new SortableTree({
    nodes: config.nodes,
    disableSorting: !config.dragAndDrop.enabled,
    element: document.getElementById(config.treeElementId),
    stateId: TREE_STATE_ID,
    initCollapseLevel: 0,
    lockRootLevel: false,

    /**
     * @param {SortableTreeNode} movedNode
     * @param {SortableTreeNode} targetParentNode
     */
    confirm: async (movedNode, targetParentNode) => {
      const oldPrefix = movedNode.data.name;
      const newPrefix = targetParentNode ? `${targetParentNode.data.name}/${movedNode.data.title}` : movedNode.data.title;

      if (oldPrefix === newPrefix) {
        return;
      }

      const success = await syscall("system.invokeFunction", "index.renamePrefixCommand", {
        oldPrefix,
        newPrefix,
        disableConfirmation: !config.dragAndDrop.confirmOnRename,
      });

      if (success && config.currentPage.indexOf(oldPrefix) === 0) {
        // If this renamed the current page, navigate to it at it's updated name.
        await syscall("editor.navigate", config.currentPage.replace(oldPrefix, newPrefix), false, false);
      }

      return success;
    },

    onChange: async () => {
      await syscall("system.invokeFunction", "treeview.show");
    },

    /**
     * @param {SortableTreeNode} node
     */
    onClick: async (_event, node) => {
      await syscall("editor.navigate", node.data.name, false, false);
    },

    /**
     * @param {SortableTreeNode["data"]} data
     * @returns {string}
     */
    renderLabel: (data) => `
      <span
        data-current-page="${JSON.stringify(data.isCurrentPage || false)}"
        data-node-type="${data.nodeType}"
        data-permission="${data.perm}"
        title="${data.name}" >
        ${data.title}
      </span>`
    ,
  });
}

/**
 * Initializes the tree view and it's action bar.
 * @param {TreeViewConfig} config
 */
// deno-lint-ignore no-unused-vars
function initializeTreeViewPanel(config) {
  const tree = createTreeView(config);
  const handleAction = (action) => {
    switch (action) {
      case "collapse-all": {
        document.querySelectorAll("sortable-tree-node[open='true']").forEach((node) => node.collapse(true));
        return true;
      }
      case "expand-all": {
        document.querySelectorAll("sortable-tree-node:not([open='true'])").forEach((node) => node.collapse(false));
        return true;
      }
      case "close-panel": {
        syscall("system.invokeFunction", "treeview.hide");
        return true;
      }
      case "refresh": {
        syscall("system.invokeFunction", "treeview.show");
        return true;
      }
      case "reveal-current-page": {
        const currentNode = tree.findNode("isCurrentPage", true);
        if (currentNode) {
          currentNode.reveal();
          currentNode.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest",
          });
          return true;
        }
        return false;
      }
    }

    return false;
  }

  handleAction("reveal-current-page");

  document.querySelectorAll("[data-treeview-action]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (handleAction(el.dataset["treeviewAction"])) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
  })
}
