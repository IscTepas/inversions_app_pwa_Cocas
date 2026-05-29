import React from "react";
import { List, BarChart2, Layers } from "lucide-react";
import { useAppShellStore, type AppShellSection } from "../../store/appShell";

interface NavItem {
  section: AppShellSection;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { section: "watchlist", icon: <List size={20} />, label: "Watchlist" },
  { section: "analysis", icon: <BarChart2 size={20} />, label: "Análisis" },
  { section: "strategies", icon: <Layers size={20} />, label: "Estrategias" },
];

const iconButtonStyle = (isActive: boolean): React.CSSProperties => ({
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
  cursor: "pointer",
  transition: "color var(--duration-fast) var(--easing-standard)",
  outline: "none",
  flexShrink: 0,
});

export function ActivityBar() {
  const { activeSection, leftPanelCollapsed, setActiveSection } = useAppShellStore();

  const handleKeyDown = (e: React.KeyboardEvent, section: AppShellSection) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActiveSection(section);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        paddingTop: "var(--space-sm)",
        paddingBottom: "var(--space-sm)",
      }}
    >
      <nav
        aria-label="Navegación principal"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-xs)",
          width: "100%",
        }}
      >
        {NAV_ITEMS.map(({ section, icon, label }) => {
          const isActive = activeSection === section && !leftPanelCollapsed;
          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              onKeyDown={(e) => handleKeyDown(e, section)}
              onMouseDown={(e) => e.preventDefault()}
              aria-label={label}
              aria-pressed={isActive}
              title={label}
              tabIndex={0}
              style={iconButtonStyle(isActive)}
            >
              {icon}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
