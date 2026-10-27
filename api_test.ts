import assert from "node:assert/strict";
import type { PageMeta } from "@silverbulletmd/silverbullet/types";
import { getPageTree, type TreeNode } from "./api.ts";
import { getPlugConfig } from "./config.ts";

function flatten(nodes: TreeNode[]): TreeNode["data"][] {
  return nodes.flatMap((node) => [node.data, ...flatten(node.nodes)]);
}

Deno.test("current page remains stable across index refreshes", async (t) => {
  const originalSyscall = Reflect.get(globalThis, "syscall");
  let currentPage = "";
  let pages: PageMeta[] = [];
  let exists = true;
  let metadataReads = 0;
  let metadataResult: (() => Promise<unknown>) | undefined;
  let config: Record<string, unknown> = {};
  Reflect.set(globalThis, "syscall", (name: string, ...args: unknown[]) => {
    switch (name) {
      case "editor.getCurrentPage":
        return Promise.resolve(currentPage);
      case "system.getSpaceConfig":
        return Promise.resolve(config);
      case "system.invokeFunction":
        assert.equal(args[0], "index.queryLuaObjects");
        return Promise.resolve(structuredClone(pages));
      case "space.getPageMeta":
        assert.equal(args[0], currentPage);
        metadataReads++;
        if (metadataResult) return metadataResult();
        return exists
          ? Promise.resolve({ name: currentPage })
          : Promise.reject(new Error("Not found"));
      default:
        throw new Error(`Unexpected syscall: ${name}`);
    }
  });

  async function seed(name: string, tags: string[] = []) {
    currentPage = `Examples/${name}`;
    exists = true;
    metadataReads = 0;
    config = {};
    pages = [{ name: currentPage, tags } as PageMeta];
    await getPageTree(await getPlugConfig());
  }
  async function rows(showHidden = false) {
    return flatten(
      (await getPageTree(await getPlugConfig(), showHidden)).nodes,
    );
  }

  try {
    await t.step(
      "keeps the current row through repeated index gaps",
      async () => {
        await seed("Active");
        pages = [{ name: "Examples/Other" } as PageMeta];
        for (let i = 0; i < 2; i++) {
          const active = (await rows()).find((row) => row.name === currentPage);
          assert.ok(active, "current row disappeared during reindexing");
          assert.equal(active.nodeType, "page");
          assert.equal(active.isCurrentPage, true);
        }
        assert.equal(metadataReads, 2);
      },
    );

    await t.step("preserves tag exclusions on cached metadata", async () => {
      await seed("Hidden", ["hidden"]);
      pages = [];
      config = { exclusions: [{ type: "tags", tags: ["hidden"] }] };
      assert.equal((await rows()).length, 0);
      assert.ok((await rows(true)).some((row) => row.name === currentPage));
    });

    await t.step("preserves regex exclusions", async () => {
      await seed("Excluded");
      pages = [];
      config = { exclusions: [{ type: "regex", rule: "^Examples/" }] };
      assert.equal((await rows()).length, 0);
    });

    await t.step("does not restore a deleted page", async () => {
      await seed("Deleted");
      pages = [];
      exists = false;
      assert.equal((await rows()).length, 0);
    });

    await t.step("clears cached metadata after deletion", async () => {
      exists = true;
      assert.equal((await rows()).length, 0);
    });

    await t.step(
      "does not carry the previous page into a new page",
      async () => {
        await seed("Previous");
        currentPage = "Examples/New";
        pages = [];
        assert.equal((await rows()).length, 0);
        assert.equal(metadataReads, 0);
      },
    );

    await t.step("replaces cached tags with fresh index metadata", async () => {
      await seed("Updated");
      pages = [{ name: currentPage, tags: ["hidden"] } as PageMeta];
      config = { exclusions: [{ type: "tags", tags: ["hidden"] }] };
      assert.equal((await rows()).length, 0);
      pages = [];
      assert.equal((await rows()).length, 0);
    });

    await t.step("does not duplicate an indexed current page", async () => {
      await seed("Indexed");
      assert.equal(
        (await rows()).filter((row) => row.name === currentPage).length,
        1,
      );
      assert.equal(metadataReads, 0);
    });

    for (const fails of [false, true]) {
      await t.step(
        `isolates an in-flight fallback (${fails ? "failure" : "success"})`,
        async () => {
          await seed("Older");
          const olderPage = currentPage;
          pages = [];
          let release!: () => void;
          let entered!: () => void;
          const started = new Promise<void>((resolve) => entered = resolve);
          const pending = new Promise<void>((resolve) => release = resolve);
          metadataResult = async () => {
            entered();
            await pending;
            if (fails) throw new Error("Not found");
            return { name: olderPage };
          };
          const olderTree = rows();
          await started;
          metadataResult = undefined;
          await seed("Newer");
          release();
          const olderRows = await olderTree;
          assert.equal(
            olderRows.some((row) => row.name === currentPage),
            false,
          );
          assert.equal(olderRows.some((row) => row.name === olderPage), !fails);
          pages = [];
          assert.ok((await rows()).some((row) => row.name === currentPage));
        },
      );
    }
  } finally {
    if (originalSyscall === undefined) {
      Reflect.deleteProperty(globalThis, "syscall");
    } else Reflect.set(globalThis, "syscall", originalSyscall);
  }
});
