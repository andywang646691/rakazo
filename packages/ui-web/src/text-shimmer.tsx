import type { ComponentProps } from "react";
import { cn } from "./lib/utils.js";

/** Text with a light sweeping across it, for something in progress. Plain text under Reduce Motion. */
function TextShimmer({
  isPaused = false,
  className,
  ...props
}: ComponentProps<"span"> & { isPaused?: boolean }) {
  return (
    <span
      data-slot="text-shimmer"
      data-paused={isPaused || undefined}
      className={cn("text-shimmer", className)}
      {...props}
    />
  );
}

export { TextShimmer };
