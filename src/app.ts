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

/**
 * ============================================================================
 * 🛡️ IdentityForge Security Hardening Checklist
 * ============================================================================
 *
 * [ ] Configure Helmet with custom options
 * [ ] Configure CORS properly (allowed origins, credentials, methods)
 * [ ] Implement Redis-based Rate Limiting
 * [ ] Implement Brute Force Protection (Login, OTP, Forgot Password)
 * [ ] Implement Request Slow Down
 * [ ] Validate Origin Header for sensitive routes
 * [ ] Implement CSRF Protection (if required)
 * [ ] Validate every Request using Zod
 * [ ] Sanitize user inputs
 * [ ] Secure Cookie Configuration
 * [ ] Refresh Token Rotation
 * [ ] Refresh Token Reuse Detection
 * [ ] Account Lockout after multiple failed logins
 * [ ] Secure Swagger Documentation
 * [ ] Disable Swagger in Production
 * [ ] Add Request ID Middleware
 * [ ] Add Correlation ID Middleware
 * [ ] Implement Audit Logging
 * [ ] Mask Sensitive Information in Logs
 * [ ] Add Security Monitoring
 * [ ] Prevent Sensitive Error Leakage
 * [ ] Implement Secure Response Headers
 * [ ] Implement SSRF Protection
 * [ ] Secure File Upload Validation
 * [ ] Implement IP Whitelisting (Admin APIs)
 * [ ] Implement Role-Based Access Control (RBAC)
 * [ ] Implement Permission-Based Access Control
 * [ ] Secure Password Policy
 * [ ] Email Verification Enforcement
 * [ ] Detect Suspicious Login Activity
 * [ ] Implement Session Management
 * [ ] Device Session Tracking
 * [ ] Logout From Single Device
 * [ ] Logout From All Devices
 * [ ] Session Revocation
 * [ ] JWT Secret Rotation Strategy
 * [ ] Environment Variable Validation
 * [ ] Secrets Management
 * [ ] Graceful Shutdown
 * [ ] Configure Trust Proxy
 * [ ] Request Timeout Handling
 * [ ] Response Size Limiting
 * [ ] Security Event Notifications
 * [ ] Prometheus Metrics
 * [ ] Health Checks (Health, Ready, Live)
 * [ ] API Versioning Strategy
 * [ ] API Deprecation Strategy
 * [ ] Database Backup Strategy
 * [ ] Database Least Privilege User
 * [ ] Redis Authentication & Security
 * [ ] Docker Security Hardening
 * [ ] Nginx Security Headers
 * [ ] HTTPS Enforcement
 * [ ] HSTS Configuration
 * [ ] CSP Configuration (if serving HTML)
 * [ ] Automated Security Testing
 * [ ] Dependency Vulnerability Scanning
 * [ ] Penetration Testing Checklist
 *
 * ============================================================================
 * Future Enhancements
 * ============================================================================
 *
 * [ ] MFA (2FA)
 * [ ] TOTP Authentication
 * [ ] WebAuthn / Passkeys
 * [ ] OAuth Providers
 * [ ] SSO (SAML / LDAP)
 * [ ] API Keys
 * [ ] Personal Access Tokens
 * [ ] OAuth Device Flow
 * [ ] Webhooks with Signature Verification
 * [ ] Distributed Rate Limiting
 * [ ] WAF Integration
 * [ ] Cloud Security Hardening
 *
 * ============================================================================
 */
