import { type Request } from "express";
import { UAParser } from "ua-parser-js";

export const getSessionMetadata = (req: Request) => {
  const parser = new UAParser(req.headers["user-agent"]);

  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"]?.toString() ?? null,
    browser: browser.name ?? null,
    os: os.name ?? null,
    device: device.type ?? "Desktop",
    country: null,
    city: null,
  };
};
