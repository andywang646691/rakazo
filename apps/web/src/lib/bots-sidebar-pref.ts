const STORAGE_PREFIX = "rakazo:bots-sidebar-collapsed:";

export function botsSidebarCollapsedStorageKey(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return `${STORAGE_PREFIX}${userId}`;
}

export function readBotsSidebarCollapsed(userId: string | null | undefined): boolean {
  const storageKey = botsSidebarCollapsedStorageKey(userId);
  if (!storageKey) return false;
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export function writeBotsSidebarCollapsed(
  userId: string | null | undefined,
  collapsed: boolean,
): void {
  const storageKey = botsSidebarCollapsedStorageKey(userId);
  if (!storageKey) return;
  try {
    if (collapsed) window.localStorage.setItem(storageKey, "1");
    else window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore quota / private-mode failures; in-memory state still applies.
  }
}

export const BOTS_SIDEBAR_MINI_WIDTH = 72;
/** Expanded width before the person drags the edge. */
export const BOTS_SIDEBAR_DEFAULT_WIDTH = 280;
export const BOTS_SIDEBAR_MIN_WIDTH = 240;
export const BOTS_SIDEBAR_MAX_WIDTH = 480;
export const BOTS_SIDEBAR_SNAP_WIDTH = 160;
const MIN_CHAT_WIDTH = 320;

export function botsSidebarWidthStorageKey(userId: string | null | undefined): string | null {
  return userId ? `rakazo:bots-sidebar-width:${userId}` : null;
}

export function maximumBotsSidebarWidth(viewportWidth: number): number {
  return Math.max(
    BOTS_SIDEBAR_MIN_WIDTH,
    Math.min(BOTS_SIDEBAR_MAX_WIDTH, viewportWidth - MIN_CHAT_WIDTH),
  );
}

export function clampBotsSidebarWidth(width: number, viewportWidth = Number.POSITIVE_INFINITY) {
  return Math.max(BOTS_SIDEBAR_MIN_WIDTH, Math.min(maximumBotsSidebarWidth(viewportWidth), width));
}

export function readBotsSidebarWidth(userId: string | null | undefined): number {
  const fallback = BOTS_SIDEBAR_DEFAULT_WIDTH;
  const key = botsSidebarWidthStorageKey(userId);
  if (!key) return fallback;
  try {
    const saved = Number(window.localStorage.getItem(key));
    return Number.isFinite(saved) && saved >= BOTS_SIDEBAR_MIN_WIDTH
      ? clampBotsSidebarWidth(saved)
      : fallback;
  } catch {
    return fallback;
  }
}

export function writeBotsSidebarWidth(userId: string | null | undefined, width: number): void {
  const key = botsSidebarWidthStorageKey(userId);
  if (!key || !Number.isFinite(width)) return;
  try {
    window.localStorage.setItem(key, String(clampBotsSidebarWidth(width)));
  } catch {
    // Keep resizing usable when storage is unavailable.
  }
}
