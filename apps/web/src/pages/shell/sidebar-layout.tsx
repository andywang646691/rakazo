import { SidebarProvider } from "@rakazo/ui-web";
import type { ComponentProps, CSSProperties } from "react";
import { createContext, useContext } from "react";
import { BOTS_SIDEBAR_FIXED_WIDTH, BOTS_SIDEBAR_MINI_WIDTH } from "../../lib/bots-sidebar-pref";

const SidebarWidthContext = createContext(BOTS_SIDEBAR_FIXED_WIDTH);

export function useBotsSidebarWidth() {
  return useContext(SidebarWidthContext);
}

export function BotsSidebarLayout({
  collapsed,
  onCollapsedChange,
  children,
  ...props
}: ComponentProps<typeof SidebarProvider> & {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const width = collapsed ? BOTS_SIDEBAR_MINI_WIDTH : BOTS_SIDEBAR_FIXED_WIDTH;
  return (
    <SidebarWidthContext value={width}>
      <SidebarProvider
        {...props}
        open={!collapsed}
        onOpenChange={(open) => onCollapsedChange(!open)}
        style={
          {
            "--sidebar-width": `${BOTS_SIDEBAR_FIXED_WIDTH}px`,
            "--sidebar-width-icon": `${BOTS_SIDEBAR_MINI_WIDTH}px`,
          } as CSSProperties
        }
      >
        {children}
      </SidebarProvider>
    </SidebarWidthContext>
  );
}
