import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import hpp from "hpp";

import { env } from "./config/env.js";
import { setupSwagger } from "./docs/swagger.js";

// Shared Middlewares
import { requestIdMiddleware } from "./shared/middlewares/request-id.middleware.js";
import { requestContextMiddleware } from "./shared/request-context/request-context.middleware.js";
import { requestLoggerMiddleware } from "./shared/middlewares/request-logger.middleware.js";
import { metricsMiddleware } from "./shared/middlewares/metrics.middleware.js";
import { notFoundHandler } from "./shared/middlewares/notFound.middleware.js";
import { globalErrorHandler } from "./shared/middlewares/error.middleware.js";

// Module Routes
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import systemRoutes from "./modules/system/system.routes.js";

const app: Application = express();

/**
 * ----------------------------------------------------------------------------
 * 1. Reverse Proxy Configuration
 * ----------------------------------------------------------------------------
 * Trust the first hop proxy (Docker, Nginx, Cloud Load Balancer) so that
 * req.ip, req.protocol, and req.hostname correctly reflect client values.
 */
app.set("trust proxy", 1);

/**
 * ----------------------------------------------------------------------------
 * 2. Observability & Request Tracing (Mounted First)
 * ----------------------------------------------------------------------------
 * Ensures every incoming request receives an X-Request-ID, an AsyncLocalStorage
 * logger context, and Prometheus metrics telemetry before any routing occurs.
 */
app.use(requestIdMiddleware);
app.use(requestContextMiddleware);
app.use(requestLoggerMiddleware);
app.use(metricsMiddleware);

/**
 * ----------------------------------------------------------------------------
 * 3. Security & Utility Middlewares
 * ----------------------------------------------------------------------------
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "same-site",
    },
  }),
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(compression());
app.use(hpp());

app.disable("x-powered-by");

/**
 * ----------------------------------------------------------------------------
 * 4. API Documentation (Swagger)
 * ----------------------------------------------------------------------------
 */
if (env.NODE_ENV !== "production") {
  setupSwagger(app);
}

/**
 * ----------------------------------------------------------------------------
 * 5. Primary Application Routes
 * ----------------------------------------------------------------------------
 */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/system", systemRoutes);

/**
 * ----------------------------------------------------------------------------
 * 6. Error Handling Pipeline
 * ----------------------------------------------------------------------------
 */
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;