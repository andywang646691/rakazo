import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Stepper } from "./components/ui/stepper.js";
import { TextShimmer } from "./text-shimmer.js";

describe("TextShimmer", () => {
  it("sweeps by default and keeps the caller's classes", () => {
    const html = renderToString(<TextShimmer className="truncate">Reading files</TextShimmer>);
    expect(html).toContain('class="text-shimmer truncate"');
    expect(html).not.toContain("data-paused");
  });

  it("marks itself paused so the sweep stops", () => {
    expect(renderToString(<TextShimmer isPaused>Waiting</TextShimmer>)).toContain(
      'data-paused="true"',
    );
  });

  it("shimmers only the description of a busy step", () => {
    const html = renderToString(
      <Stepper
        completeLabel="Done"
        steps={[
          { id: "a", title: "A", description: "Idle step", status: "upcoming" },
          { id: "b", title: "B", description: "Busy step", status: "current", busy: true },
        ]}
      />,
    );
    expect(html.match(/text-shimmer/g)).toHaveLength(1);
    expect(html).toMatch(/text-shimmer[^>]*>Busy step</);
  });
});
