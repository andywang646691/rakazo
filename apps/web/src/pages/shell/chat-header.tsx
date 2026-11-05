import { useLingui } from "@lingui/react/macro";
import type { Bot, Group, ThreadSnapshot } from "@rakazo/contracts";
import { BotAvatar, Button, GroupAvatar } from "@rakazo/ui-web";
import { ChevronRight, Gift, Menu, Phone } from "lucide-react";
import { useState } from "react";
import { IconTooltip } from "../../components/IconTooltip";
import { InviteDialog } from "../../components/InviteDialog";
import { useBilling } from "../../components/SubscriptionGate";

/** The floating header over the transcript: navigation, the chat's name, call and invite. */
export function ChatHeader({
  inGroup,
  active,
  activeGroup,
  activeSnapshot,
  phoneCallsEnabled,
  voiceReady,
  inCall,
  panelOpen,
  onOpenNavigation,
  onTogglePanel,
  onCall,
}: {
  inGroup: boolean;
  active: Bot | undefined;
  activeGroup: Group | undefined;
  activeSnapshot: ThreadSnapshot | null;
  phoneCallsEnabled: boolean;
  /** False while the voice status loads or no voice is connected; the button then opens voice settings. */
  voiceReady: boolean;
  inCall: boolean;
  panelOpen: boolean;
  onOpenNavigation: () => void;
  onTogglePanel: () => void;
  onCall: (bot: Bot) => void;
}) {
  const { t } = useLingui();
  const referral = useBilling().status?.referral;
  const [inviteOpen, setInviteOpen] = useState(false);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24">
      <div className="chat-header-frost" aria-hidden="true">
        <span data-frost="1" />
        <span data-frost="2" />
        <span data-frost="3" />
        <span data-frost="4" />
      </div>
      <div className="relative grid h-full grid-cols-[1fr_minmax(0,auto)_1fr] items-start gap-2 px-3 pt-3 md:px-[22px] [&_button]:pointer-events-auto">
        <div className="flex items-center">
          <Button
            variant="floating"
            size="icon-lg"
            aria-label={t`Open navigation`}
            onClick={onOpenNavigation}
            className="app-no-drag md:hidden"
          >
            <Menu strokeWidth={1.7} className="size-[19px]" />
          </Button>
        </div>
        <Button
          variant="floating"
          data-testid="bot-settings-trigger"
          aria-expanded={panelOpen}
          onClick={onTogglePanel}
          className="bot-name-capsule app-no-drag h-11 min-w-0 gap-2 border border-border bg-background py-1 ps-1.5 pe-3.5 shadow-none"
        >
          {inGroup ? (
            <GroupAvatar
              members={activeSnapshot?.members ?? activeGroup?.members ?? []}
              size={32}
            />
          ) : active ? (
            <BotAvatar
              avatarSet={active.avatarSet}
              color={active.color}
              identity={active.id}
              size={32}
              status={active.status}
            />
          ) : null}
          <span className="flex min-w-0 items-center">
            <span className="min-w-0 truncate text-[15px] font-semibold text-foreground" dir="auto">
              {inGroup
                ? (activeGroup?.name ?? activeSnapshot?.groupName ?? t`Group`)
                : (active?.name ?? t`Select a bot`)}
            </span>
            <span className="bot-name-chevron text-muted-foreground">
              <ChevronRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </span>
          </span>
        </Button>
        <div className="flex items-center justify-self-end gap-2">
          {phoneCallsEnabled && !inGroup && active ? (
            <IconTooltip label={inCall ? t`Open call` : t`Call`}>
              <Button
                variant="floating"
                size="icon-lg"
                data-testid="call-button"
                aria-label={inCall ? t`Open call` : t`Call`}
                onClick={() => onCall(active)}
                data-active={inCall ? "" : undefined}
                data-voice-ready={voiceReady ? "" : undefined}
                className="app-no-drag"
              >
                <Phone strokeWidth={1.6} className="size-[17px]" />
              </Button>
            </IconTooltip>
          ) : null}
          {referral && !inGroup && active ? (
            <IconTooltip label={t`Invite a friend`}>
              <Button
                variant="floating"
                size="icon-lg"
                aria-label={t`Invite a friend`}
                onClick={() => setInviteOpen(true)}
                className="app-no-drag"
              >
                <Gift strokeWidth={1.6} className="size-[17px]" />
              </Button>
            </IconTooltip>
          ) : null}
        </div>
        {referral ? (
          <InviteDialog referral={referral} open={inviteOpen} onOpenChange={setInviteOpen} />
        ) : null}
      </div>
    </div>
  );
}
