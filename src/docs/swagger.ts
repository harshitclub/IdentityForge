import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "IdentityForge API",
      version: "1.0.0",
      description:
        "Authentication & Authorization REST API built with Express + TypeScript",
    },

    servers: [
      {
        url: "http://localhost:5000/api/v1",
        description: "Development Server",
      },
    ],

    tags: [
      {
        name: "Authentication",
        description: "Authentication endpoints",
      },
      {
        name: "Users",
        description: "User endpoints",
      },
      {
        name: "Admin",
        description: "Admin endpoints",
      },
    ],

    components: {
      securitySchemes: {
        AccessCookie: {
          type: "apiKey",
          in: "cookie",
          name: "if_accessToken",
        },

        RefreshCookie: {
          type: "apiKey",
          in: "cookie",
          name: "if_refreshToken",
        },
      },
    },
  },

  apis: ["./src/modules/**/*.routes.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: express.Application) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
