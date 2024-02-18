export async function supportsPageRenaming() {
  try {
    // The ability to rename arbitrary pages was implemented in v0.7.2 - the
    // same version that introduced the `system.getVersion` syscall.
    // It is also available in some 0.7.1 versions "edge" versions. But in order
    // to support the latter, we don't compare the actual version returned --
    // as long as this syscall succeeds, we know that we can rename pages.
    await syscall("system.getVersion");
    return true;
  } catch (_err) {
    return false;
  }
}
