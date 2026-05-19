import { describe, it, expect } from "vitest";
import { TermChatAssistant } from "../../../../src/modules/strategies/term/termChatAssistant";
import type { CalendarSpreadResult } from "../../../../src/modules/strategies/term/calendarSpreadEngine";

describe("TermChatAssistant", () => {
  const mockCalendarResult: CalendarSpreadResult = {
    shortDte: 30,
    longDte: 90,
    shortTheta: -5,
    longTheta: -3,
    netTheta: -2,
    scenarios: [
      { underlyingPrice: 100, strategyValue: 3, pnl: 0, theta: -2, impliedVolatility: 0.2 },
    ],
  };

  describe("constructor", () => {
    it("should accept calendar result", () => {
      const chat = new TermChatAssistant(mockCalendarResult, null, null, null);
      expect(chat).toBeInstanceOf(TermChatAssistant);
    });

    it("should accept no results", () => {
      const chat = new TermChatAssistant(null, null, null, null);
      expect(chat).toBeInstanceOf(TermChatAssistant);
    });
  });

  describe("getContext", () => {
    it("should return context from calendar result", () => {
      const chat = new TermChatAssistant(mockCalendarResult, null, null, null);
      const ctx = chat.getContext();
      expect(ctx).not.toBeNull();
      expect(ctx!.strategyType).toBe("calendar");
      expect(ctx!.shortDte).toBe(30);
    });

    it("should return null when no data", () => {
      const chat = new TermChatAssistant(null, null, null, null);
      expect(chat.getContext()).toBeNull();
    });
  });

  describe("explain", () => {
    it("should generate explanation with purpose", () => {
      const chat = new TermChatAssistant(mockCalendarResult, null, null, null);
      const explanation = chat.explain();
      expect(explanation.purpose.length).toBeGreaterThan(0);
      expect(explanation.purpose).toContain("Calendar Spread");
    });

    it("should include risk profile", () => {
      const chat = new TermChatAssistant(mockCalendarResult, null, null, null);
      const explanation = chat.explain();
      expect(explanation.riskProfile.length).toBeGreaterThan(0);
      expect(explanation.riskProfile).toContain("theta");
    });

    it("should include usage conditions", () => {
      const chat = new TermChatAssistant(mockCalendarResult, null, null, null);
      const explanation = chat.explain();
      expect(explanation.usageConditions.length).toBeGreaterThan(0);
    });

    it("should include disclaimer (RNF-001)", () => {
      const chat = new TermChatAssistant(mockCalendarResult, null, null, null);
      const explanation = chat.explain();
      expect(explanation.disclaimer).toContain("financial advice");
      expect(explanation.disclaimer).toContain("informational");
    });

    it("should include structured output", () => {
      const chat = new TermChatAssistant(mockCalendarResult, null, null, null);
      const explanation = chat.explain();
      expect(explanation.structuredOutput).toHaveProperty("purpose");
      expect(explanation.structuredOutput).toHaveProperty("conditions");
      expect(explanation.structuredOutput).toHaveProperty("risks");
      expect(explanation.structuredOutput).toHaveProperty("metrics");
    });

    it("should include disclaimer that it does not authorize execution", () => {
      const chat = new TermChatAssistant(mockCalendarResult, null, null, null);
      const explanation = chat.explain();
      expect(explanation.disclaimer).toContain("does not constitute financial advice");
      expect(explanation.disclaimer).toContain("informational");
    });
  });
});
