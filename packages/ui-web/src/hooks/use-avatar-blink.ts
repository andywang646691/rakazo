import type { RefObject } from "react";
import { useEffect } from "react";

const BLINK_MS = 140;
const GAP_MS = { min: 2600, max: 5800 };

const targets = new Set<SVGSVGElement>();
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule() {
  if (timer !== undefined || targets.size === 0) return;
  const wait = GAP_MS.min + Math.random() * (GAP_MS.max - GAP_MS.min);
  timer = setTimeout(() => {
    timer = undefined;
    const all = [...targets];
    const eyes = all[Math.floor(Math.random() * all.length)];
    if (eyes) {
      eyes.dataset.blink = "true";
      setTimeout(() => {
        delete eyes.dataset.blink;
      }, BLINK_MS);
    }
    schedule();
  }, wait);
}

/**
 * Blinks the avatar now and then by setting `data-blink` for a moment. One timer serves every
 * blinking avatar and picks a single one per tick, so a busy page does no per-avatar work and
 * no infinite animation runs between blinks.
 */
export function useAvatarBlink(ref: RefObject<SVGSVGElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    targets.add(element);
    schedule();
    return () => {
      targets.delete(element);
      delete element.dataset.blink;
      if (targets.size === 0 && timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };
  }, [ref, enabled]);
}
