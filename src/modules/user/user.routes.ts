import { Router } from "express";
import {
  deleteAccount,
  getSessions,
  revokeSession,
  updateProfile,
} from "./user.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { updateSchema } from "./user.validator.js";
import { authenticateUser } from "../../shared/middlewares/authenticate.user.js";

const userRoutes = Router();

userRoutes.patch(
  "/profile",
  authenticateUser,
  validate(updateSchema),
  updateProfile,
);

userRoutes.delete("/account", deleteAccount);

userRoutes.get("/sessions", authenticateUser, getSessions);

userRoutes.delete("/sessions/:sessionId", revokeSession);

export default userRoutes;
