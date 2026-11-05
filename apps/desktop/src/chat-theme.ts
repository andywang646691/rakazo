export const CHAT_ENHANCEMENTS_CSS = `
  /* Desktop-only drag strip. Bubble, capsule, and composer colors come from the web theme. */
  .app-drag.absolute.inset-x-0.top-0 {
    height: 60px !important;
    z-index: 10 !important;
    pointer-events: auto !important;
    -webkit-app-region: drag !important;
    background: linear-gradient(
      to bottom,
      var(--background) 0%,
      color-mix(in srgb, var(--background) 90%, transparent) 40%,
      color-mix(in srgb, var(--background) 40%, transparent) 75%,
      transparent 100%
    ) !important;
    backdrop-filter: blur(8px) saturate(140%) !important;
    -webkit-backdrop-filter: blur(8px) saturate(140%) !important;
    -webkit-mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%) !important;
    mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%) !important;
  }

  div:has(> [data-testid="bot-settings-trigger"]),
  div:has(> button[data-testid="bot-settings-trigger"]) {
    z-index: 20 !important;
    pointer-events: none !important;
  }

  [data-testid="bot-settings-trigger"],
  div:has(> [data-testid="bot-settings-trigger"]) button,
  .app-no-drag {
    pointer-events: auto !important;
    -webkit-app-region: no-drag !important;
  }
`;
