import type { LogContext } from "../types/logger.type.js";

export const createLogContext = (
  event: string,
  context: Omit<LogContext, "event"> = {},
): LogContext => ({
  event,
  ...context,
});
