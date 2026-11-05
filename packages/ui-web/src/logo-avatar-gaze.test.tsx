// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LogoAvatar } from "./logo-avatar.js";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
    run(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => vi.unstubAllGlobals());

it("marks a following avatar and leaves others alone", () => {
  expect(renderToString(<LogoAvatar followPointer />)).toContain('data-gaze="true"');
  expect(renderToString(<LogoAvatar />)).not.toContain("data-gaze");
  expect(renderToString(<LogoAvatar followPointer size={16} />)).not.toContain("data-gaze");
});

it("turns the eyes toward the pointer and lets go on unmount", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<LogoAvatar followPointer size={40} />));
  const svg = container.querySelector("svg")!;
  svg.getBoundingClientRect = () => new DOMRect(100, 100, 40, 40);

  await act(async () => {
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 600, clientY: 120 }));
  });
  expect(svg.style.getPropertyValue("--logo-gaze-x")).toBe("1");
  expect(svg.style.getPropertyValue("--logo-gaze-y")).toBe("0");

  await act(async () => root.unmount());
  expect(svg.style.getPropertyValue("--logo-gaze-x")).toBe("");
  container.remove();
});

it("does not follow a pointer under a still avatar", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<LogoAvatar followPointer size={16} />));
  const svg = container.querySelector("svg")!;
  svg.getBoundingClientRect = () => new DOMRect(0, 0, 16, 16);
  await act(async () => {
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 600, clientY: 0 }));
  });
  expect(svg.style.getPropertyValue("--logo-gaze-x")).toBe("");
  await act(async () => root.unmount());
  container.remove();
});
