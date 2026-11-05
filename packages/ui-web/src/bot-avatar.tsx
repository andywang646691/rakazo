import type { BotAvatarSet } from "@rakazo/contracts";
import type { AvatarEyes, BotColorDef, LogoAvatarActivity } from "@rakazo/core";
import {
  ACTIVE_RUN_STATUSES,
  AVATAR_STILL_MAX_SIZE,
  avatarEyeRects,
  avatarIdentitySeed,
  BOT_AVATAR_COLORS,
  BOT_COLOR_LIST,
  botEyeTone,
  DEFAULT_BOT_AVATAR_COLOR,
  logoAvatarBusy,
  logoAvatarFinished,
  ORGANIC_AVATAR_EYES,
  ORGANIC_AVATAR_VIEWBOX,
  organicAvatarEyeTilt,
  organicAvatarPath,
  resolvePersonaColorDef,
  SHIPPED_BOT_AVATAR_EYES,
  SHIPPED_BOT_AVATAR_SHAPE_KEYS,
  SHIPPED_BOT_AVATAR_SHAPES,
  SHIPPED_BOT_AVATAR_VIEWBOX,
  shippedBotAvatarShapePath,
} from "@rakazo/core";
import type { ComponentProps, CSSProperties } from "react";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { useBotAvatarActivity } from "./bot-avatar-activity.js";
import { useAvatarBlink } from "./hooks/use-avatar-blink.js";
import { useAvatarGaze } from "./hooks/use-avatar-gaze.js";
import { useAvatarMotionVisibility } from "./hooks/use-avatar-motion-visibility.js";
import { cn } from "./lib/utils.js";
import { LogoAvatar } from "./logo-avatar.js";
import "./styles.css";

export type { BotColorDef };
export { BOT_AVATAR_COLORS, BOT_COLOR_LIST, DEFAULT_BOT_AVATAR_COLOR, resolvePersonaColorDef };

export const BOT_SHAPES = SHIPPED_BOT_AVATAR_SHAPES;
export const SHIPPED_SHAPE_KEYS = SHIPPED_BOT_AVATAR_SHAPE_KEYS;
const VIEWBOX = SHIPPED_BOT_AVATAR_VIEWBOX;

export const BOT_MASCOT_SHAPES = SHIPPED_SHAPE_KEYS.map(
  (k) => BOT_SHAPES[k] ?? FALLBACK_SHAPE_PATH,
);

const FALLBACK_SHAPE_PATH = BOT_SHAPES.hex ?? "";

export function parseBotAvatar(
  rawColor: string,
  _identity?: string,
): {
  color: string;
  shapeIndex?: number;
  isImage: boolean;
  imageUrl?: string;
} {
  if (!rawColor) return { color: "#F97316", isImage: false };
  // Only data: image URLs are rendered. Arbitrary http(s)/blob values in `color`
  // must not become <img src> (SSRF / tracking when other members view the bot).
  if (rawColor.startsWith("data:image/")) {
    return { color: "#F97316", isImage: true, imageUrl: rawColor };
  }
  if (rawColor.includes("::shape_")) {
    const parts = rawColor.split("::shape_");
    const rawShapeIdx = parts[1] ?? "0";
    const parsedShapeIdx = /^\d+$/.test(rawShapeIdx) ? Number(rawShapeIdx) : 0;
    const shapeIdx = Number.isSafeInteger(parsedShapeIdx) ? parsedShapeIdx : 0;
    return {
      color: parts[0] || "#F97316",
      shapeIndex: shapeIdx % SHIPPED_SHAPE_KEYS.length,
      isImage: false,
    };
  }
  return { color: rawColor, isImage: false };
}

const AVATAR_HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function defaultBotAvatarValue(rawColor: string): string {
  const parsed = parseBotAvatar(rawColor);
  if (rawColor && !parsed.isImage && AVATAR_HEX.test(parsed.color)) return parsed.color;
  return DEFAULT_BOT_AVATAR_COLOR;
}

export interface BotAvatarProps {
  color: string;
  avatarSet?: BotAvatarSet;
  activity?: LogoAvatarActivity;
  size?: number;
  status?: string;
  identity?: string;
  /** The eyes follow the pointer while the bot rests. */
  followPointer?: boolean;
  className?: string;
}

export const BotAvatar = memo(function BotAvatar({
  color,
  avatarSet,
  activity,
  size = 36,
  status,
  identity = "",
  followPointer,
  className,
}: BotAvatarProps) {
  const id = useId().replace(/[^a-zA-Z0-9-_]/g, "");
  const isWorking = ACTIVE_RUN_STATUSES.some((s) => s === status);

  const parsed = useMemo(() => parseBotAvatar(color, identity), [color, identity]);
  const effectiveId = identity || parsed.color || "agent";

  const colorDef = useMemo(
    () => resolvePersonaColorDef(effectiveId, parsed.color),
    [effectiveId, parsed.color],
  );

  if (parsed.isImage && parsed.imageUrl) {
    return (
      <div
        className={cn("rakazo-bot-avatar relative shrink-0 select-none", className)}
        data-working={isWorking}
        style={{ width: size, height: size }}
      >
        <div className="rakazo-bot-avatar-picture relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
          <img src={parsed.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
        {isWorking ? (
          <svg
            className="rakazo-bot-avatar-ring rakazo-bot-avatar-ring-working absolute pointer-events-none"
            style={{
              inset: -4,
              width: size + 8,
              height: size + 8,
            }}
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              className="stroke-status-working"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray="45 80"
            />
          </svg>
        ) : null}
      </div>
    );
  }

  if (parsed.shapeIndex === undefined && avatarSet === "rakazo") {
    const Avatar = activity === undefined ? LiveLogoAvatar : LogoAvatar;
    return (
      <Avatar
        avatarValue={color ? colorDef.hex : undefined}
        identity={effectiveId}
        size={size}
        activity={activity}
        status={status}
        followPointer={followPointer}
        className={className}
      />
    );
  }
  if (parsed.shapeIndex === undefined) {
    const Avatar = activity === undefined ? LiveOrganicAvatar : OrganicAvatar;
    return (
      <Avatar
        color={colorDef.hex}
        identity={effectiveId}
        size={size}
        isWorking={isWorking}
        activity={activity}
        status={status}
        followPointer={followPointer}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "rakazo-bot-avatar bot-avatar-container relative inline-flex items-center justify-center shrink-0 select-none",
        className,
      )}
      style={{
        width: size,
        height: size,
      }}
      data-working={isWorking}
    >
      <svg
        className="rakazo-bot-avatar-ring absolute pointer-events-none"
        style={{
          inset: -4,
          width: size + 8,
          height: size + 8,
          filter: `drop-shadow(0 0 6px ${colorDef.hex}) drop-shadow(0 0 10px #ffffff)`,
        }}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke={`url(#${id}-ring)`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="45 80"
        />
        <circle cx="43" cy="24" r="2.8" fill="#ffffff" />
        <defs>
          <linearGradient id={`${id}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="60%" stopColor={colorDef.hex} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colorDef.hex} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        viewBox={VIEWBOX}
        aria-hidden="true"
        className={cn(
          "overflow-visible transition-transform duration-300",
          isWorking
            ? "animate-pulse scale-[1.04] motion-reduce:animate-none"
            : "hover:scale-[1.03] motion-reduce:hover:scale-100",
        )}
        // Inline size so a parent's icon sizing (Button sizes bare SVGs) cannot shrink it.
        style={{
          width: size,
          height: size,
          filter: isWorking
            ? `drop-shadow(0 0 8px ${colorDef.hex}) drop-shadow(0 0 2px #ffffff)`
            : "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
        }}
      >
        <g>
          <path d={shippedBotAvatarShapePath(parsed.shapeIndex)} fill={colorDef.hex} />
          <g className={cn("bot-character-eyes", eyeFill(colorDef.hex))}>
            <BarEyes eyes={SHIPPED_BOT_AVATAR_EYES} />
          </g>
        </g>
      </svg>
    </div>
  );
});

/** Only live Rakazo consumers subscribe to public activity updates. */
function LiveLogoAvatar({
  status,
  ...props
}: ComponentProps<typeof LogoAvatar> & { status?: string }) {
  const activity = useBotAvatarActivity(props.identity ?? "", status);
  return <LogoAvatar {...props} activity={activity} />;
}

/** Only live consumers subscribe to public activity updates, like the logo avatar. */
function LiveOrganicAvatar({
  status,
  ...props
}: ComponentProps<typeof OrganicAvatar> & { status?: string }) {
  const activity = useBotAvatarActivity(props.identity ?? "", status);
  return <OrganicAvatar {...props} activity={activity} />;
}

/**
 * The default avatar. A busy bot sways (one transform on the outer svg, so the compositor moves
 * it), the eyes take a pose for what it is doing, a finished bot nods once, and a resting one is a
 * still picture. Nothing inside the svg animates: that would repaint the page on every frame.
 */
function OrganicAvatar({
  color,
  identity,
  size,
  isWorking,
  activity,
  followPointer = false,
  className,
}: {
  color: string;
  identity?: string;
  size: number;
  /** A run is active, including one waiting on the user: the body glows. */
  isWorking: boolean;
  activity?: LogoAvatarActivity;
  status?: string;
  followPointer?: boolean;
  className?: string;
}) {
  const { ref, visible, reducedMotion } = useAvatarMotionVisibility(true);
  const seed = avatarIdentitySeed(identity || color || DEFAULT_BOT_AVATAR_COLOR);
  const current = activity ?? (isWorking ? "working" : "idle");
  const canMove = visible && !reducedMotion && size > AVATAR_STILL_MAX_SIZE;
  const busy = canMove && logoAvatarBusy(current);

  const previous = useRef(current);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const was = previous.current;
    previous.current = current;
    setFinished(canMove && logoAvatarFinished(was, current));
  }, [current, canMove]);

  useAvatarGaze(ref, canMove && followPointer);
  useAvatarBlink(ref, busy || (canMove && followPointer));

  return (
    <svg
      ref={ref}
      viewBox={ORGANIC_AVATAR_VIEWBOX}
      aria-hidden="true"
      className={cn("rakazo-organic-avatar overflow-visible select-none", className)}
      data-working={isWorking}
      data-activity={current}
      data-motion={busy ? "running" : finished ? "finished" : "still"}
      data-paused={!visible}
      data-shape-family={seed % 10}
      style={{
        width: size,
        height: size,
        flex: "none",
      }}
    >
      {(["idle", "working"] as const).map((mode) => (
        <path
          key={mode}
          className={`rakazo-organic-avatar-body rakazo-organic-avatar-body-${mode}`}
          d={organicAvatarPath(seed)}
          fill={color}
          style={{
            filter:
              mode === "working"
                ? `drop-shadow(0 0 ${Math.round(size * 0.16)}px ${color})`
                : "drop-shadow(0 2px 3px rgba(0,0,0,.34))",
          }}
        />
      ))}
      <g transform={`rotate(${organicAvatarEyeTilt(seed)})`}>
        <g className="rakazo-organic-avatar-pose">
          <g className={`rakazo-organic-avatar-eyes ${eyeFill(color)}`}>
            <BarEyes eyes={ORGANIC_AVATAR_EYES} />
          </g>
        </g>
      </g>
    </svg>
  );
}

function BarEyes({ eyes }: { eyes: AvatarEyes }) {
  return avatarEyeRects(eyes).map((rect) => <rect key={rect.x} {...rect} />);
}

/** Eyes are cut-outs in the page color unless the body is nearly white or black. */
function eyeFill(bodyHex: string): string {
  const tone = botEyeTone(bodyHex);
  if (tone === "dark") return "fill-foreground dark:fill-background";
  if (tone === "light") return "fill-background dark:fill-foreground";
  return "fill-background";
}

export function BotShapePreview({
  shapeIndex,
  identity,
  label,
  color,
  selected,
  onClick,
}: {
  /** An Avatar Studio shape; omit it to draw the organic body `identity` gets. */
  shapeIndex?: number;
  identity?: string;
  label?: string;
  color: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const key =
    shapeIndex === undefined
      ? undefined
      : (SHIPPED_SHAPE_KEYS[shapeIndex % SHIPPED_SHAPE_KEYS.length] ?? "hex");
  const colorDef = resolvePersonaColorDef("preview", color);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? key}
      aria-pressed={selected ?? false}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        selected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-popover bg-white/10"
          : "hover:bg-white/5",
      )}
    >
      {shapeIndex === undefined ? (
        <BotAvatar color={color} identity={identity} size={32} />
      ) : (
        <svg viewBox={VIEWBOX} className="size-8 overflow-visible" aria-hidden="true">
          <path d={shippedBotAvatarShapePath(shapeIndex)} fill={colorDef.hex} />
          <g className={eyeFill(colorDef.hex)}>
            <BarEyes eyes={SHIPPED_BOT_AVATAR_EYES} />
          </g>
        </svg>
      )}
    </button>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-11 w-11 items-center justify-center gap-1.5 rounded-full bg-card">
        <span className="h-4 w-[7px] rounded-full bg-primary" />
        <span className="h-4 w-[7px] rounded-full bg-primary" />
      </div>
      <span className="font-[Aeonik,ui-sans-serif] text-[28px] tracking-tight text-foreground">
        Rakazo
      </span>
    </div>
  );
}
