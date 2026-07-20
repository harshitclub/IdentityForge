import type { NextFunction, Request, Response } from "express";

const requests = new Map();

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const ip = req.ip;
  const currentTime = Date.now();
  const WINDOW_SIZE = 60 * 1000;
  const MAX_REQUESTS = 5;

  const requestData = requests.get(ip);

  if (!requestData) {
    // First request

    requests.set(ip, {
      count: 1,
      windowStart: currentTime,
    });

    next();
    return;
  }

  // Check if window expired

  if (currentTime - requestData.windowStart > WINDOW_SIZE) {
    // Reset everything

    requestData.count = 1;
    requestData.windowStart = currentTime;

    next();
    return;
  }

  requestData.count++;

  if (requestData.count > MAX_REQUESTS) {
    return res.status(429).json({
      message: "Too many requests",
    });
  }

  next();
}
