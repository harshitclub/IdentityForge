import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import hpp from "hpp";

import { morganMiddleware } from "./config/morgan.js";

import { notFoundHandler } from "./shared/middlewares/notFound.middleware.js";
import { globalErrorHandler } from "./shared/middlewares/error.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import { setupSwagger } from "./docs/swagger.js";
import systemRoutes from "./modules/system/system.routes.js";

const app: Application = express();

/**
 * Security & Utility Middlewares
 */
app.use(morganMiddleware);
app.use(helmet());
app.use(cors());

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(cookieParser());
app.use(compression());
app.use(hpp());

app.disable("x-powered-by");

setupSwagger(app);

/**
 * API Routes
 */
app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/users", userRoutes);

app.use("/api/v1/admin", adminRoutes);

app.use("/system", systemRoutes);

/**
 * 404 Handler
 */
app.use(notFoundHandler);

/**
 * Global Error Handler
 */
app.use(globalErrorHandler);

export default app;
