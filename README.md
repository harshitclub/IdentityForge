# IdentityForge

Production-grade Authentication and Identity Management microservice built with Express 5, TypeScript, Prisma, PostgreSQL, Redis, and BullMQ.

---

## Key Highlights

* Token Lifecycle and RTR: Short-lived Access Tokens (JWT) and Refresh Token Rotation (RTR) storing SHA-256 hashed JTI tokens in PostgreSQL.
* Brute-Force and Replay Defense: Automatic account lockout (`lockUntil`) after consecutive failed attempts; token revocation on logout, password change, and reset.
* Asynchronous Task Offloading: Transactional emails (Verification, Password Reset) queued via BullMQ with exponential backoff retries.
* Redis Cache-Aside: Profile and administrative user caching with automatic cache invalidation triggers.
* Distributed Rate Limiting: Centralized Redis rate limiting enforcing standard RFC headers (`X-RateLimit-*`, `Retry-After`).
* Observability and Tracing: Node.js `AsyncLocalStorage` request tracing with correlated `X-Request-ID`, structured Winston JSON logs, and Prometheus metrics.
* Automated Test Suite: 252 unit and integration tests with over 90% code coverage using Vitest.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| Runtime and Framework | Node.js (v22), Express 5, TypeScript |
| Database and ORM | PostgreSQL 17, Prisma ORM (`@prisma/adapter-pg`) |
| Cache and Queues | Redis 8, BullMQ, ioRedis |
| Security and Auth | JWT (`jsonwebtoken`), Bcrypt, Helmet, HPP, Zod |
| Observability | Winston, AsyncLocalStorage, Prometheus (`prom-client`), Grafana |
| Testing and Benchmarks | Vitest (v8 coverage), Supertest, k6 |

---

## Architecture Overview

```
[ Client / Browser ]
        | (HTTP-only Cookies)
        v
[ Express 5 Gateway ] --- (AsyncLocalStorage Context & Winston Logger)
   |     |     |
   |     |     +---> [ Redis ] (Rate Limiting, Cache-Aside, BullMQ Queue)
   |     |              |
   |     |              v
   |     |         [ BullMQ Worker ] ---> [ SMTP Service ] (Email Dispatch)
   |     |
   |     +---> [ PostgreSQL ] (Users, Sessions, Hashed Tokens)
   |
   +---> [ Prometheus ] ---> [ Grafana Dashboard ] (/system/metrics)
```

---

## API Summary

### Authentication (`/api/v1/auth`)
* `POST /signup` - Register a new user account (Queues verification email)
* `POST /login` - Authenticate credentials and issue HTTP-only cookies
* `POST /logout` - Invalidate active session and clear cookies
* `POST /refresh-token` - Rotate refresh token and issue new token pair
* `POST /verify-email` - Verify email address with one-time token
* `POST /resend-verification` - Resend verification email
* `POST /forgot-password` - Request password reset link
* `POST /reset-password` - Reset password with token
* `POST /change-password` - Authenticated password update
* `GET  /me` - Retrieve current user profile (Redis cached)
* `POST /revoke-all-sessions` - Invalidate all active sessions

### User Self-Service (`/api/v1/users`)
* `PATCH  /profile` - Update user profile information
* `DELETE /account` - Self-account soft deletion
* `GET    /sessions` - List all active devices and sessions
* `DELETE /sessions/:sessionId` - Revoke a specific active device session

### Administrative (`/api/v1/admin`)
* `GET    /users` - Paginated user directory (Redis cached)
* `GET    /users/:id` - Get user details by ID
* `PATCH  /users/:id/role` - Promote or demote user role (`USER` / `ADMIN`)
* `PATCH  /users/:id/status` - Update account status (`ACTIVE`, `SUSPENDED`, `BANNED`)
* `DELETE /users/:id` - Admin-triggered user deletion and session purge

### System Probes (`/system`)
* `GET  /live` - Liveness probe (HTTP 200)
* `GET  /ready` - Readiness probe (PostgreSQL and Redis connectivity)
* `GET  /health` - Comprehensive dependency health check
* `GET  /info` - Process runtime metadata
* `GET  /version` - Application version information
* `POST /cache/reset` - Clear Redis cache (Admin only)
* `GET  /metrics` - Prometheus metrics scraper endpoint

Swagger UI documentation is available at `http://localhost:5000/api-docs` in non-production environments.

---

## Performance Benchmarks (k6 Load Tests)

IdentityForge was benchmarked under concurrent load using k6:

| Scenario | Virtual Users (VUs) | Requests | P95 Latency | Error Rate | 500 Crashes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Health Probes | 1 VU | 10 | 3.51 ms | 0.00% | 0 |
| High-Concurrency Probes | 50 VUs | 500 | 41.00 ms | 0.00% | 0 |
| Auth and Rate Limiting | 30 VUs | 1,123 | 561.20 ms | 0.00% | 0 |

* Benchmarked with Bcrypt (10 rounds), PostgreSQL connection pooling, and Redis rate-limiting active with zero connection dropouts.

---

## Getting Started

### 1. Prerequisites
* Node.js >= 20.0.0
* Docker and Docker Compose

### 2. Environment Setup
```bash
cp .env.example .env
```

### 3. Start Infrastructure and Server
```bash
# Start PostgreSQL, Redis, Prometheus, and Grafana
npm run infra:start

# Generate Prisma client and run database migrations
npm run prisma:generate
npm run prisma:migrate

# Start development server
npm run dev
```

### 4. Running via Docker
```bash
docker compose up -d --build
```

---

## Testing

```bash
# Run unit and integration tests (252 tests)
npm run test:run

# Generate test coverage report
npm run test:coverage

# Run k6 smoke and load tests
k6 run k6/smoke/health.js
k6 run k6/load/rate-limit.js
```

---

## License
MIT License. Built by [Harshit Kumar](https://github.com/harshitclub).