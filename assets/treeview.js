const STATE_ID = "treeview";

/**
 * Initializes a `SortableTree` instance. 
 * 
 * There is currently a bug (still trying to narrow down the exact cause) in
 * which `new SortableTree` can throw an exception because of something 
 * invalid with the state. So if there is an error, this clears the state
 * and tries once more to create the tree.
 */
function createPageTree(nodes, retries = 1) {
  try {
    return new SortableTree({
      nodes,
      disableSorting: true,
      element: document.getElementById("treeview-tree"),
      stateId: STATE_ID,
      initCollapseLevel: 0,
      onClick: async (_event, node) => {
        await syscall("editor.navigate", node.data.ref || node.data.name, false, false);
      },
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
  
  } catch (err) {
    if (retries > 0) {
      // SortableTree can throw an error if the state somehow becomes invalid.
      // This attempts to recover from that.
      sessionStorage.removeItem(`sortableTreeState-${STATE_ID}`);
      return createPageTree(0);
    } else {
      throw err;
    }
  }
}

// deno-lint-ignore no-unused-vars
function initializeTreeView(settings) {
  const tree = createPageTree(settings.nodes);
  const currentNode = tree.findNode("name", settings.currentPage);
  
  const revealCurrentPage = () => {
    if (currentNode) {
      currentNode.reveal();
      currentNode.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "nearest",
      });
    }  
  }

  revealCurrentPage();

  document.getElementById("treeview-action-button-close").addEventListener("click", () => {
    syscall("system.invokeFunction", "treeview.hide");
  });

  document.getElementById("treeview-action-button-refresh").addEventListener("click", () => {
    syscall("system.invokeFunction", "treeview.show");
  });

  document.getElementById("treeview-action-button-reveal-current-page").addEventListener("click", () => {
    revealCurrentPage();
  });

  document.getElementById("treeview-action-button-collapse-all").addEventListener("click", () => {
    document.querySelectorAll("sortable-tree-node[open='true']").forEach((node) => node.collapse(true));
  });
  
  document.getElementById("treeview-action-button-expand-all").addEventListener("click", () => {
    document.querySelectorAll("sortable-tree-node:not([open='true'])").forEach((node) => node.collapse(false));
  });
}
