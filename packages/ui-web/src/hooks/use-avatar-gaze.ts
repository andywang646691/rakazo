import { avatarGaze } from "@rakazo/core";
import type { RefObject } from "react";
import { useEffect } from "react";

type Follower = (pointer: { x: number; y: number }) => void;
const followers = new Set<Follower>();
let pointer: { x: number; y: number } | null = null;
let frame = 0;

function onPointerMove(event: PointerEvent) {
  pointer = { x: event.clientX, y: event.clientY };
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (pointer) for (const follow of followers) follow(pointer);
  });
}

function follow(follower: Follower) {
  if (followers.size === 0)
    window.addEventListener("pointermove", onPointerMove, { passive: true });
  followers.add(follower);
  return () => {
    followers.delete(follower);
    if (followers.size === 0) {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
    }
  };
}

/**
 * Turns an avatar's eyes toward the pointer by setting `--logo-gaze-x` and `--logo-gaze-y`
 * (-1 to 1) on it. One listener serves every following avatar, and no React update runs
 * on a move. The eyes come back to centre when following stops.
 */
export function useAvatarGaze(ref: RefObject<SVGSVGElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const stop = follow((at) => {
      const gaze = avatarGaze(element.getBoundingClientRect(), at);
      element.style.setProperty("--logo-gaze-x", String(gaze.x));
      element.style.setProperty("--logo-gaze-y", String(gaze.y));
    });
    return () => {
      stop();
      element.style.removeProperty("--logo-gaze-x");
      element.style.removeProperty("--logo-gaze-y");
    };
  }, [ref, enabled]);
}
