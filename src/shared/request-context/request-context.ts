import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "winston";
import { logger } from "../logging/logger.js";

export interface RequestContext {
  requestId: string;
  logger: Logger;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const runRequestContext = (
  context: RequestContext,
  callback: () => void,
) => {
  requestContextStorage.run(context, callback);
};

export const getRequestContext = () => {
  return requestContextStorage.getStore();
};

export const getRequestLogger = (): Logger => {
  return getRequestContext()?.logger ?? logger;
};
