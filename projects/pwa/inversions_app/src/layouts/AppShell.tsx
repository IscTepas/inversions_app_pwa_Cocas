import React from "react";
import { Drawer } from "../components/ui/Drawer";
import { useAppShellStore } from "../store/appShell";

interface AppShellProps {
  activityBar: React.ReactNode;
  leftPanel: React.ReactNode;
  main: React.ReactNode;
}

const TABLET_BREAKPOINT = 1023;

export function AppShell({ activityBar, leftPanel, main }: AppShellProps) {
  const { leftPanelCollapsed } = useAppShellStore();

  const leftWidth = leftPanelCollapsed ? "0px" : "var(--left-panel-width)";

  return (
    <div
      data-testid="app-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--color-bg)",
        overflow: "hidden",
      }}
    >
      <div
        data-testid="app-shell-body"
        style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}
      >
        <div
          data-testid="app-shell-activity-bar"
          style={{
            width: "var(--activity-bar-width)",
            flexShrink: 0,
            background: "var(--color-surface)",
            borderRight: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {activityBar}
        </div>

        <div
          data-testid="app-shell-left-panel"
          style={{
            width: leftWidth,
            flexShrink: 0,
            overflow: "hidden",
            transition: "width 0.25s ease",
            background: "var(--color-surface)",
            borderRight: "1px solid var(--color-border)",
          }}
          className="app-shell-left-panel"
        >
          {leftPanel}
        </div>

        <main
          data-testid="app-shell-main"
          style={{ flex: 1, overflow: "auto", minWidth: 0, width: 0 }}
        >
          {main}
        </main>
      </div>

      <Drawer
        isOpen={false}
        onClose={() => {}}
        position="left"
        width="var(--left-panel-width)"
        title="Panel"
      >
        {leftPanel}
      </Drawer>

      <style>{`
        @media (max-width: ${TABLET_BREAKPOINT}px) {
          .app-shell-left-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
