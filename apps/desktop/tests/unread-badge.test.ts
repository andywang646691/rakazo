import { describe, expect, test } from "vitest";
import { unreadBadgeCount } from "../src/unread-badge";

describe("unread dock badge", () => {
  test("counts unread bots and groups, using the current space when it is listed", () => {
    expect(
      unreadBadgeCount({
        current: {
          id: "space-1",
          bots: [{ unread: true }, { unread: false }],
          groups: [{ unread: true }],
        },
        spaces: [
          { id: "space-1", bots: [], groups: [] },
          { id: "space-2", bots: [{ unread: true }], groups: [{ unread: false }] },
        ],
      }),
    ).toBe(3);
  });

  test("falls back to the current space when the list is empty", () => {
    expect(
      unreadBadgeCount({
        current: { bots: [{ unread: true }], groups: [] },
      }),
    ).toBe(1);
    expect(unreadBadgeCount({})).toBe(0);
  });
});
