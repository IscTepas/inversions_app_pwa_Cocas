import { describe, expect, it } from "vitest";
import { FundamentalCopilotChat } from "../../../src/modules/ai/fundamentalCopilotChat";

const hasAnyApiKey = Boolean(
  process.env.FMP_API_KEY ||
  process.env.FINNHUB_API_KEY ||
  process.env.SIMFIN_API_KEY ||
  process.env.FINVIZ_API_KEY
);

describe("FundamentalCopilotChat", () => {
  it.skipIf(!hasAnyApiKey)("returns a baseline response structure", async () => {
    const copilot = new FundamentalCopilotChat();
    const response = await copilot.generateResponse({
      ticker: "AAPL",
      question: "¿Cuál es la fortaleza fundamental de esta acción?",
      includeStrategyRecommendation: true
    });

    expect(response.answer).toContain("AAPL");
    expect(response.sourceContext.some(ctx => ctx.includes("AAPL"))).toBe(true);
    expect(response.disclaimer).toContain("informativo");
    expect(response.answer.toLowerCase()).not.toContain("compra");
    expect(response.answer.toLowerCase()).not.toContain("vende");
  });

  it.skipIf(!hasAnyApiKey)("includes scenario guidance for market change questions", async () => {
    const copilot = new FundamentalCopilotChat();
    const response = await copilot.generateResponse({
      ticker: "AAPL",
      question: "¿Qué puede cambiar si la volatilidad aumenta?",
      includeStrategyRecommendation: false
    });

    expect(response.answer).toContain("Riesgo");
    expect(response.disclaimer).toContain("recomendación de inversión");
  });

  it.skipIf(!hasAnyApiKey)("explains calculation steps when asked how it was calculated", async () => {
    const copilot = new FundamentalCopilotChat();
    const response = await copilot.generateResponse({
      ticker: "AAPL",
      question: "¿Cómo calculaste ese score?",
      includeStrategyRecommendation: false
    });

    expect(response.answer).toContain("AAPL");
    expect(response.answer).toContain("score");
  });
});
