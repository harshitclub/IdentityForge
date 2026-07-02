import { Router } from "express";
import { health, info, live, ready, version } from "./system.controller.js";

const systemRoutes = Router();

systemRoutes.get("/health", health);
systemRoutes.get("/ready", ready);
systemRoutes.get("/live", live);
systemRoutes.get("/version", version);
systemRoutes.get("/info", info);
// systemRoutes.get("/metrics");

export default systemRoutes;
