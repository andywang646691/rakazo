import { avatarGaze } from "@rakazo/core";

const AVATAR = ".rakazo-organic-avatar";

/**
 * While the pointer is over `row`, turns the eyes of the default avatar inside it toward the
 * pointer by setting `--logo-gaze-x` and `--logo-gaze-y` (-1 to 1); when it leaves, the eyes go
 * back to their resting place. It is plain DOM: no React state, no timers, and nothing runs while
 * the pointer is elsewhere. Returns a cleanup, so it can be used directly as a ref callback.
 */
export function attachAvatarHoverGaze(row: HTMLElement | null): (() => void) | undefined {
  if (!row || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
  let avatar: SVGElement | null = null;
  let frame = 0;
  let at: { x: number; y: number } | null = null;

  const aim = () => {
    frame = 0;
    if (!avatar || !at) return;
    const gaze = avatarGaze(avatar.getBoundingClientRect(), at);
    avatar.style.setProperty("--logo-gaze-x", String(gaze.x));
    avatar.style.setProperty("--logo-gaze-y", String(gaze.y));
  };
  const release = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    at = null;
    avatar?.style.removeProperty("--logo-gaze-x");
    avatar?.style.removeProperty("--logo-gaze-y");
    avatar = null;
  };
  const onMove = (event: PointerEvent) => {
    avatar ??= row.querySelector<SVGElement>(AVATAR);
    if (!avatar) return;
    at = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(aim);
  };

  row.addEventListener("pointermove", onMove, { passive: true });
  row.addEventListener("pointerleave", release);
  return () => {
    row.removeEventListener("pointermove", onMove);
    row.removeEventListener("pointerleave", release);
    release();
  };
}
