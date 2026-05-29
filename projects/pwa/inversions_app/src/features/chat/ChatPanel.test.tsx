import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ChatPanel } from "./ChatPanel";

vi.mock("../../store/signals", () => ({
  useSignalStore: () => ({ selectedInstrument: { symbol: "AAPL" } }),
}));

vi.mock("../../store/appShell", () => ({
  useAppShellStore: () => ({ analysisCategory: "technical" }),
}));

vi.mock("../../services/chat/chatApi", () => ({
  sendChatMessage: vi.fn().mockResolvedValue({ explanation: "Respuesta del asistente." }),
  sendFundamentalCopilotMessage: vi.fn().mockResolvedValue({ answer: "Respuesta fundamental." }),
}));

const storageData: Record<string, string> = {};
let getItemSpy: ReturnType<typeof vi.spyOn>;
let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  Object.keys(storageData).forEach(k => delete storageData[k]);
  getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) => storageData[key] ?? null);
  setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string, value: string) => { storageData[key] = value; });
});

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el header con titulo 'Chat IA'", () => {
    render(<ChatPanel />);
    expect(screen.getByText("Chat IA")).toBeDefined();
  });



  it("historial vacio muestra placeholder", () => {
    render(<ChatPanel />);
    expect(screen.getByText(/haz una pregunta/i)).toBeDefined();
  });

  it("carga historial desde sessionStorage al montar", () => {
    const saved = JSON.stringify([{
      id: "1", role: "user", content: "Pregunta guardada", context: null, timestamp: Date.now(), status: "ok"
    }]);
    storageData["inversions.chat.history"] = saved;
    render(<ChatPanel />);
    expect(screen.getByText("Pregunta guardada")).toBeDefined();
  });

  it("enviar mensaje llama sendChatMessage y actualiza la UI", async () => {
    const { sendChatMessage } = await import("../../services/chat/chatApi");
    render(<ChatPanel />);
    const textarea = screen.getByPlaceholderText(/escribe tu pregunta/i);
    fireEvent.change(textarea, { target: { value: "Sobrecomprado?" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({ question: "Sobrecomprado?" })
      );
    });
  });

  it("guarda el historial en sessionStorage despues de enviar", async () => {
    render(<ChatPanel />);
    const textarea = screen.getByPlaceholderText(/escribe tu pregunta/i);
    fireEvent.change(textarea, { target: { value: "Test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    await waitFor(() => {
      expect(storageData["inversions.chat.history"]).not.toBeUndefined();
    });
  });
});
