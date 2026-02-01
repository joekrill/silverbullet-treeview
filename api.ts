import { editor, space, system } from "@silverbulletmd/silverbullet/syscalls";
import { AttachmentMeta, PageMeta } from "@silverbulletmd/silverbullet/types";
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

  nodeType: string;
};

export type PageData = PageMeta & NodeData & {
  nodeType: "page";
};

export type FolderData = NodeData & {
  nodeType: "folder";
};

export type AttachmentData = AttachmentMeta & NodeData & {
  nodeType: "attachment";
};

export type TreeNode = {
  data: PageData | FolderData | AttachmentData;
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

  console.log(`${PLUG_DISPLAY_NAME}: exclusions config:`, JSON.stringify(config.exclusions));
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

  pages.sort((a, b) => a.name.localeCompare(b.name));

  const sortOrder = config.sort?.order ?? "asc";
  const positions = config.sort?.positions ?? {};
  const posFolder = positions.folders ?? 1;
  const posFolderNote = positions.folderNotes ?? 1;
  const posPage = positions.pages ?? 2;
  const posAttachment = positions.attachments ?? 2;

  const getNodeWeight = (node: TreeNode): number => {
    if (node.data.nodeType === "folder") return posFolder;
    if (node.data.nodeType === "attachment") return posAttachment;
    // It's a page - check if it's a folder-note (has children)
    if (node.nodes.length > 0) return posFolderNote;
    return posPage;
  };

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const weightA = getNodeWeight(a);
      const weightB = getNodeWeight(b);

      // Sort by weight first
      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // Equal weights: alphabetical comparison
      const cmp = a.data.title.localeCompare(b.data.title);
      return sortOrder === "desc" ? -cmp : cmp;
    });
    nodes.forEach((n) => sortNodes(n.nodes));
  };

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
          },
          nodes: [],
        };
      }

      parent.nodes.push(node);
      return node;
    }, root);
  });

  // Add attachments if enabled
  if (config.attachments?.enabled) {
    let attachments = await space.listAttachments() as AttachmentMeta[];

    // Filter by extension regex if provided
    if (config.attachments.extensionExcludeRegex) {
      const regex = new RegExp(config.attachments.extensionExcludeRegex);
      attachments = attachments.filter((a) => !regex.test(a.name));
    }

    attachments.forEach((attachment) => {
      attachment.name.split("/").reduce((parent, title, currentIndex, parts) => {
        const isLeaf = parts.length - 1 === currentIndex;
        let node = parent.nodes.find((child) => child.data.title === title);

        if (node) {
          if (isLeaf && node.data.nodeType === "folder") {
            // Convert folder to attachment
            node.data = {
              ...attachment,
              title,
              isCurrentPage: false,
              nodeType: "attachment",
            };
          }
          return node;
        }

        if (isLeaf) {
          node = {
            data: {
              ...attachment,
              title,
              isCurrentPage: false,
              nodeType: "attachment",
            },
            nodes: [],
          };
        } else {
          const name = parts.slice(0, currentIndex + 1).join("/");
          node = {
            data: {
              title,
              isCurrentPage: false,
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
  }

  sortNodes(root.nodes);

  return {
    nodes: root.nodes,
    currentPage,
  };
}
