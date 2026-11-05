export const CHAT_ENHANCEMENTS_CSS = `
  /* 聊天区顶部毛玻璃渐变拖拽区 */
  .app-drag.absolute.inset-x-0.top-0 {
    height: 60px !important;
    z-index: 10 !important;
    pointer-events: auto !important;
    -webkit-app-region: drag !important;
    background: linear-gradient(
      to bottom,
      var(--background, #ffffff) 0%,
      color-mix(in srgb, var(--background, #ffffff) 90%, transparent) 40%,
      color-mix(in srgb, var(--background, #ffffff) 40%, transparent) 75%,
      transparent 100%
    ) !important;
    backdrop-filter: blur(8px) saturate(140%) !important;
    -webkit-backdrop-filter: blur(8px) saturate(140%) !important;
    -webkit-mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%) !important;
    mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%) !important;
  }

  /* 确保 ChatHeader 容器置于渐变层之上，且其空隙部分透传点击/拖动手势到渐变层 */
  div:has(> [data-testid="bot-settings-trigger"]),
  div:has(> button[data-testid="bot-settings-trigger"]) {
    z-index: 20 !important;
    pointer-events: none !important;
  }

  /* 按钮自身与交互元素设为 pointer-events: auto 与 app-no-drag */
  [data-testid="bot-settings-trigger"],
  div:has(> [data-testid="bot-settings-trigger"]) button,
  .app-no-drag {
    pointer-events: auto !important;
    -webkit-app-region: no-drag !important;
  }

  /* 仿 Grok 悬浮 Bot 名称胶囊按钮 */
  [data-testid="bot-settings-trigger"] {
    display: inline-flex !important;
    align-items: center !important;
    height: 32px !important;
    min-height: 32px !important;
    padding: 3px 12px 3px 4px !important;
    border-radius: 9999px !important;
    background-color: var(--background, #ffffff) !important;
    border: 1px solid rgba(0, 0, 0, 0.08) !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.04) !important;
    color: var(--foreground, #111111) !important;
    font-size: 13.5px !important;
    font-weight: 500 !important;
    letter-spacing: -0.01em !important;
    position: relative !important;
    z-index: 30 !important;
    transition: all 0.15s ease-out !important;
    user-select: none !important;
    outline: none !important;
  }

  [data-testid="bot-settings-trigger"]:hover {
    background-color: var(--background, #ffffff) !important;
    border-color: rgba(0, 0, 0, 0.14) !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    transform: translateY(-0.5px);
  }

  [data-testid="bot-settings-trigger"]:active {
    transform: translateY(0) scale(0.98);
  }

  /* 暗色模式适配 */
  .dark [data-testid="bot-settings-trigger"],
  [data-theme="dark"] [data-testid="bot-settings-trigger"] {
    background-color: rgba(36, 36, 36, 0.95) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35) !important;
    color: #f3f3f3 !important;
  }

  .dark [data-testid="bot-settings-trigger"]:hover,
  [data-theme="dark"] [data-testid="bot-settings-trigger"]:hover {
    background-color: rgba(44, 44, 44, 1) !important;
    border-color: rgba(255, 255, 255, 0.22) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45) !important;
  }

  [data-testid="bot-settings-trigger"] [data-slot="avatar"],
  [data-testid="bot-settings-trigger"] img,
  [data-testid="bot-settings-trigger"] svg {
    border-radius: 9999px !important;
  }
`;
