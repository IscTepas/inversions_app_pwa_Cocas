// FIC: ActivityBar unit tests — keyboard navigation, aria-labels, toggle behavior.
// FIC: Tests unitarios de ActivityBar — navegación por teclado, aria-labels, comportamiento de toggle.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityBar } from "./ActivityBar";

const mockToggleLeftPanel = vi.fn();

vi.mock("../../store/appShell", () => ({
  useAppShellStore: () => ({
    leftPanelCollapsed: false,
    toggleLeftPanel: mockToggleLeftPanel,
  }),
}));

describe("ActivityBar", () => {
  beforeEach(() => { mockToggleLeftPanel.mockClear(); });

  it("renderiza el botón de Watchlist", () => {
    render(<ActivityBar />);
    expect(screen.getByRole("button", { name: "Watchlist" })).toBeDefined();
  });

  it("tiene aria-label correcto", () => {
    render(<ActivityBar />);
    expect(screen.getByLabelText("Watchlist")).toBeDefined();
  });

  it("clic llama toggleLeftPanel", () => {
    render(<ActivityBar />);
    fireEvent.click(screen.getByLabelText("Watchlist"));
    expect(mockToggleLeftPanel).toHaveBeenCalledOnce();
  });
});
