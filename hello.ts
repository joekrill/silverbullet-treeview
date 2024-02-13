import { editor } from "$sb/silverbullet-syscall/mod.ts";

export async function helloWorld() {
  await editor.flashNotification("Hello world!");
}
