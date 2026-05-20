import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Inversions API — Term Strategies",
      version: "1.0.0",
      description:
        "API REST para estrategias de opciones Calendar Spread y Diagonal Spread. " +
        "Proporciona calculo de metricas, simulacion de escenarios, generacion de reportes y comparacion de estrategias.",
    },
    servers: [{ url: "/api/v1/strategies/term", description: "Term Strategies API" }],
  },
  apis: ["./src/routes/strategies/term/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
