import "../../src/styles.css";
import { attachAvatarHoverGaze, BotAvatar } from "@rakazo/ui-web";
import { useState } from "react";
import { createRoot } from "react-dom/client";

const portrait = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#a9d6e8"/><stop offset="1" stop-color="#517d9c"/></linearGradient></defs><rect width="48" height="48" fill="url(#sky)"/><path d="M4 48c2-10 9-15 20-15s18 5 20 15" fill="#31465d"/><ellipse cx="24" cy="22" rx="11" ry="13" fill="#d7a17d"/><path d="M13 21c0-12 5-17 12-17s12 5 12 17c-4-4-7-7-12-7s-8 3-12 7" fill="#3c2d2a"/></svg>',
)}`;

const organicSteps = [
  { label: "Rest", activity: "idle" },
  { label: "Dots", activity: "pending" },
  { label: "Alive", activity: "reading" },
] as const;

function OrganicExample() {
  const [step, setStep] = useState<(typeof organicSteps)[number]["activity"]>("idle");
  return (
    <div className="avatar-example" data-testid="organic-row" ref={attachAvatarHoverGaze}>
      <BotAvatar
        color="#8B5CF6"
        identity="organic-fixture"
        size={120}
        activity={step}
        className="avatar-organic"
      />
      {organicSteps.map((item) => (
        <button key={item.activity} type="button" onClick={() => setStep(item.activity)}>
          {item.label}
        </button>
      ))}
      <BotAvatar
        color="#8B5CF6"
        identity="organic-badge"
        size={120}
        activity="reading"
        still
        className="avatar-organic-badge"
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <>
    <div className="avatar-example">
      <BotAvatar
        color={portrait}
        identity="working-photo"
        size={120}
        status="running"
        className="avatar-working"
      />
      <span>Working</span>
    </div>
    <div className="avatar-example">
      <BotAvatar
        color={portrait}
        identity="idle-photo"
        size={120}
        status="idle"
        className="avatar-idle"
      />
      <span>Idle</span>
    </div>
    <div className="avatar-example">
      <BotAvatar
        color="#8B5CF6::shape_2"
        identity="idle-shape"
        size={120}
        status="idle"
        className="avatar-shape-idle"
      />
      <span>Idle shape</span>
    </div>
    <OrganicExample />
    <div className="avatar-example">
      <BotAvatar
        color="#8B5CF6"
        identity="waiting-organic"
        size={120}
        status="waiting_input"
        className="avatar-organic-waiting"
      />
      <span>Waiting</span>
    </div>
  </>,
);
