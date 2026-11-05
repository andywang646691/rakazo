type UnreadChat = { unread?: boolean };
type UnreadSpace = { id?: string; bots?: UnreadChat[]; groups?: UnreadChat[] };

/** Unread bots and groups from a spaces list, the same set the roster badge counts. */
export function unreadBadgeCount(navigation: {
  current?: UnreadSpace;
  spaces?: UnreadSpace[];
}): number {
  const current = navigation.current;
  const spaces = navigation.spaces ?? [];
  const lists =
    spaces.length > 0
      ? spaces.map((space) =>
          current && space.id && space.id === current.id
            ? { bots: current.bots, groups: current.groups }
            : space,
        )
      : current
        ? [current]
        : [];
  let count = 0;
  for (const space of lists) {
    for (const bot of space.bots ?? []) if (bot.unread) count += 1;
    for (const group of space.groups ?? []) if (group.unread) count += 1;
  }
  return count;
}
