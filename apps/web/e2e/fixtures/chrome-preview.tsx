import { I18nProvider } from "@lingui/react";
import type { Bot } from "@rakazo/contracts";
import { BOT_COLOR_LIST, chatUserBubbleColors } from "@rakazo/core";
import { BotAvatar } from "@rakazo/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { SidebarFooter } from "../../src/components/SidebarFooter";
import { bootstrapI18n, i18n } from "../../src/lib/i18n";
import { queryClient } from "../../src/lib/query";
import { applyResolvedAppearance } from "../../src/lib/ui-appearance";
import "../../src/styles.css";
import { BotSettings } from "../../src/pages/shell/bot-panel";
import { ChatHeader } from "../../src/pages/shell/chat-header";
import { Composer } from "../../src/pages/shell/composer";
import { SidebarHeader } from "../../src/pages/shell/sidebar-header";
import { BOT, FixtureTranscript } from "./thread-fixture";

const accent = BOT_COLOR_LIST.find((color) => color.id === "orange")?.hex ?? BOT.color;
const chief = {
  id: BOT.botId,
  name: "Chief",
  description: "chief.example.com",
  color: accent,
  avatarSet: "rakazo",
  status: "idle",
  notifyOnFinish: true,
  computerMode: "off",
  instructions: "",
  fleetManagement: false,
  crossSpaceCommunication: false,
  dailyCheckIns: false,
  autoSpeak: false,
  memoryScope: "isolated",
  disabledBuiltinTools: [],
} as Bot;

const noop = () => {};
const resolved = async () => {};

function RosterRow({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <div
      className={`mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${active ? "bg-sidebar-accent" : ""}`}
    >
      <BotAvatar color={accent} identity={name} size={28} />
      <span className="truncate text-[14px] font-medium">{name}</span>
    </div>
  );
}

function ChromePreview() {
  const [accountOpen, setAccountOpen] = useState(
    () => new URLSearchParams(location.search).get("menu") === "1",
  );
  return (
    <div className="flex h-dvh bg-background text-foreground">
      <aside className="flex w-[240px] shrink-0 flex-col border-e border-sidebar-border bg-sidebar">
        <SidebarHeader
          createMenuOpen={false}
          setCreateMenuOpen={noop}
          activityMode={false}
          toggleActivityMode={noop}
          onSearch={noop}
          setBotsSidebarCollapsedPref={noop}
          bots={[chief]}
          setMobileSidebarOpen={noop}
          setPanel={noop}
          navigate={noop}
          setNewSpaceOpen={noop}
          setCreateBotOpen={noop}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden pt-1">
          <RosterRow name="Chief" active />
          <RosterRow name="Scout" />
          <RosterRow name="Ledger" />
        </div>
        <SidebarFooter
          name="Alex"
          initials="A"
          email="alex@example.com"
          open={accountOpen}
          onOpenChange={setAccountOpen}
          onIntegrations={noop}
          onSkills={noop}
          onArtifacts={noop}
          onSettings={noop}
          onLogOut={noop}
          signingOut={false}
          logOutError={null}
        />
      </aside>
      <main className="relative flex min-w-0 flex-1 flex-col">
        <ChatHeader
          inGroup={false}
          active={chief}
          activeGroup={undefined}
          activeSnapshot={null}
          phoneCallsEnabled={false}
          voiceReady={false}
          inCall={false}
          panelOpen
          onOpenNavigation={noop}
          onTogglePanel={noop}
          onCall={noop}
        />
        <FixtureTranscript
          messages={[
            {
              id: "m1",
              threadId: "thread-1",
              seq: 1,
              role: "user",
              blocks: [{ kind: "text", text: "Hi! What can you help me with?" }],
              createdAt: new Date().toISOString(),
            },
            {
              id: "m2",
              threadId: "thread-1",
              seq: 2,
              role: "bot",
              botId: BOT.botId,
              blocks: [
                {
                  kind: "text",
                  text: "Pretty much anything you'd hand a sharp assistant. I can research, write, and keep an eye on things.",
                },
              ],
              createdAt: new Date().toISOString(),
            },
          ]}
          running={false}
          showToolActivity={false}
          userBubble={chatUserBubbleColors(chief.color, chief.id)}
        />
        <Composer
          artifactTarget={{ botId: BOT.botId }}
          activeName="Chief"
          running={false}
          pendingAttachments={[]}
          attachmentNotice={null}
          sendError={null}
          onOpenModels={noop}
          onOpenConnections={noop}
          runError={null}
          runErrorId={null}
          onRunErrorPresented={noop}
          onDismissError={noop}
          sending={false}
          fileInputRef={{ current: null }}
          onAttachmentPick={() => false}
          onRemoveAttachment={noop}
          onSend={async () => true}
          onStop={resolved}
          draftKey="preview"
          enterToSend
        />
      </main>
      <aside className="flex w-[360px] shrink-0 flex-col border-s border-border bg-background p-4">
        <BotSettings
          bot={chief}
          tab="computer"
          memoryProviderConfigured={false}
          onSave={resolved}
          onExport={resolved}
          onClear={noop}
          computer={
            <div>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex h-8 items-center border-b border-border px-3 text-xs text-muted-foreground">
                  example.com
                </div>
                <div className="grid h-40 place-items-center bg-foreground text-sm text-background">
                  Chief's screen
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">Chief's screen</p>
            </div>
          }
        />
      </aside>
    </div>
  );
}

const theme = new URLSearchParams(location.search).get("theme") === "dark" ? "dark" : "light";
applyResolvedAppearance(theme);
await bootstrapI18n("en");
createRoot(document.getElementById("root")!).render(
  <I18nProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <ChromePreview />
    </QueryClientProvider>
  </I18nProvider>,
);
