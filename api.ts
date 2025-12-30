import { editor, system } from "@silverbulletmd/silverbullet/syscalls";
import { PageMeta } from "@silverbulletmd/silverbullet/types";
import { PLUG_DISPLAY_NAME, TreeViewConfig } from "./config.ts";
import { filterPagesByFunction } from "./filters/filterByFunction.ts";
import { filterPagesByRegex } from "./filters/filterByRegex.ts";
import { filterPagesByTags } from "./filters/filterByTags.ts";

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

  created: string;

  lastModified: string;

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
export async function getPageTree(config: TreeViewConfig) {
  const currentPage = await editor.getCurrentPage();
  // The index plug's `queryObjects` function is used so that we include the
  // page tags -- `space.listPages()` does not populate those attributes.
  let pages = await system.invokeFunction(
    "index.queryLuaObjects",
    "page",
    {},
  ) as PageMeta[];

  const root = { nodes: [] as TreeNode[] };

  if (config.pageExcludeRegex) {
    const deprecationWarning = `${PLUG_DISPLAY_NAME}:
\`pageExcludeRegex\` setting is deprecated. Please use \`exclusions\`:

\`\`\`yaml
treeview:
  exclusions:
  - type: regex
    rule: "${config.pageExcludeRegex}"
\`\`\`
    `;
    console.warn(deprecationWarning);
    pages = filterPagesByRegex(pages, {
      rule: config.pageExcludeRegex,
      negate: false,
    });
  }

  if (config.exclusions) {
    for (const exclusion of config.exclusions) {
      switch (exclusion.type) {
        case "regex": {
          pages = filterPagesByRegex(pages, exclusion);
          break;
        }
        case "tags": {
          pages = filterPagesByTags(pages, exclusion);
          break;
        }
        case "space-function": {
          pages = await filterPagesByFunction(pages, exclusion);
          break;
        }
      }
    }
  }


  pages.forEach((page) => {
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
            created: "",
            lastModified: "",
          },
          nodes: [],
        };
      }

      parent.nodes.push(node);
      return node;
    }, root);
  });

  const sortBy = (config as any).sortBy ?? "name"; // "name" | "created" | "lastModified"
  const sortOrder = (config as any).sortOrder ?? "asc"; // "asc" | "desc"
  const groupDirsFirst = (config as any).groupDirectoriesFirst ?? false;
  const dir = sortOrder === "asc" ? 1 : -1;

  function getKey(node: TreeNode): string | number {
    const d = node.data as any;
    switch (sortBy) {
      case "created":
        return d.created ?? 0;
      case "modified":
        return d.lastModified ?? 0;
      case "title":
        return (d.title ?? d.name ?? "").toString().toLowerCase();
      case "name":
      default:
        return (d.name ?? "").toString().toLowerCase();
    }
  }

  function sortTreeNodes(nodes: TreeNode[]) {
    if (!nodes?.length) return;

    nodes.sort((a, b) => {
      if (groupDirsFirst && a.data.nodeType !== b.data.nodeType) {
        return a.data.nodeType === "folder" ? -1 : 1;
      }

      const ka = getKey(a);
      const kb = getKey(b);

      if (ka === kb) {
        return dir * a.data.name.localeCompare(b.data.name);
      }

      if (typeof ka === "number" && typeof kb === "number") {
        return dir * (ka - kb);
      }

      return dir * String(ka).localeCompare(String(kb));
    });

    for (const n of nodes) {
      sortTreeNodes(n.nodes);
    }
  }

  sortTreeNodes(root.nodes);

  return {
    nodes: root.nodes,
    currentPage,
  };
}
