// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BotAvatar } from "./bot-avatar.js";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mount(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, unmount: () => act(async () => root.unmount()) };
}

it("blinks a working avatar for a moment and then opens its eyes", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { container, unmount } = await mount(<BotAvatar color="#8B5CF6" activity="reading" />);
  const svg = container.querySelector("svg")!;
  expect(svg.dataset.blink).toBeUndefined();
  await act(async () => vi.advanceTimersByTime(2700));
  expect(svg.dataset.blink).toBe("true");
  await act(async () => vi.advanceTimersByTime(200));
  expect(svg.dataset.blink).toBeUndefined();
  await unmount();
});

it("leaves a resting avatar alone and stops its timer when the last blinker goes", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const rest = await mount(<BotAvatar color="#8B5CF6" status="idle" />);
  await act(async () => vi.advanceTimersByTime(20_000));
  expect(rest.container.querySelector("svg")!.dataset.blink).toBeUndefined();
  expect(vi.getTimerCount()).toBe(0);
  await rest.unmount();

  const busy = await mount(<BotAvatar color="#8B5CF6" activity="reading" />);
  expect(vi.getTimerCount()).toBeGreaterThan(0);
  await busy.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("does not blink a bot that only waits on the user", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { container, unmount } = await mount(<BotAvatar color="#8B5CF6" status="waiting_input" />);
  await act(async () => vi.advanceTimersByTime(20_000));
  expect(container.querySelector("svg")!.dataset.blink).toBeUndefined();
  expect(container.querySelector("svg")!.dataset.phase).toBe("rest");
  await unmount();
});

it("nods once when a working bot finishes, and stays still after", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<BotAvatar color="#8B5CF6" activity="working" />));
  const svg = container.querySelector("svg")!;
  expect(svg.dataset.phase).toBe("alive");
  await act(async () => root.render(<BotAvatar color="#8B5CF6" activity="idle" />));
  expect(svg.dataset.phase).toBe("finish");
  await act(async () => root.render(<BotAvatar color="#8B5CF6" activity="waiting" />));
  expect(svg.dataset.phase).toBe("rest");
  await act(async () => root.render(<BotAvatar color="#8B5CF6" activity="error" />));
  expect(svg.dataset.phase).toBe("rest");
  await act(async () => root.unmount());
});

it("shows three dots, not a blink, while a run has shown nothing yet", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { container, unmount } = await mount(<BotAvatar color="#8B5CF6" status="queued" />);
  const svg = container.querySelector("svg")!;
  expect(svg.dataset.phase).toBe("dots");
  await act(async () => vi.advanceTimersByTime(20_000));
  expect(svg.dataset.blink).toBeUndefined();
  expect(vi.getTimerCount()).toBe(0);
  await unmount();
});
