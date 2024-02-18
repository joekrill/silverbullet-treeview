import { editor, space } from "$sb/syscalls.ts";
import { PageMeta } from "$sb/types.ts";
export type NodeData = {
  /**
   * The complete page or folder name.
   */
  name: string;

  /**
   * The name to display in the node to the user (generally the last
   * portion of the `name`)
   */
  title: string;

  /**
   * True if this node represents the current active page
   */
  isCurrentPage?: boolean;

  nodeType: string;
};

export type PageData = PageMeta & NodeData & {
  nodeType: "page";
};

export type FolderData = NodeData & {
  nodeType: "folder";
};

export type TreeNode = {
  data: PageData | FolderData;
  nodes: TreeNode[];
};

/**
 * Generates a TreeNode array from the list of pages in the current space.
 */
export async function getPageTree() {
  const currentPage = await editor.getCurrentPage();
  const pages = await space.listPages();
  const root = { nodes: [] as TreeNode[] };

  pages.sort((a, b) => a.name.localeCompare(b.name)).forEach((page) => {
    page.name.split("/").reduce((parent, title, currentIndex, parts) => {
      const isLeaf = parts.length - 1 === currentIndex;
      let node = parent.nodes.find((child) => child.data.title === title);
      if (node) {
        if (isLeaf && !("created" in node.data)) {
          // The node was found but is currently identified as a "folder",
          // so we need to change it to a "page" type.
          node.data = {
            ...page,
            title,
            isCurrentPage: currentPage === page.name,
            nodeType: "page",
          };
        }
        return node;
      }

      if (isLeaf) {
        // We're at the last part of the page name, so this reprents the page itself.
        node = {
          data: {
            ...page,
            title,
            isCurrentPage: currentPage === page.name,
            nodeType: "page",
          },
          nodes: [],
        };
      } else {
        // This is an intermediate part of the page name and a node doesn't exist
        // yet, so this represents a "folder" (and may be converted to a page
        // at some later iteration, if the page is found)
        const name = parts.slice(0, currentIndex + 1).join("/");
        node = {
          data: {
            title,
            // A folder can still be the "current page" if it's being created
            isCurrentPage: currentPage === name,
            name,
            nodeType: "folder",
          },
          nodes: [],
        };
      }

      parent.nodes.push(node);
      return node;
    }, root);
  });

  return {
    nodes: root.nodes,
    currentPage,
  };
}
