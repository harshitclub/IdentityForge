import client from "prom-client";

/**
 * Every metric in our application will be registered here.
 */
export const register = new client.Registry();

/**
 * Add default labels to every metric.
 */
register.setDefaultLabels({
  app: "identityforge-api",
});

/**
 * Collect Node.js runtime metrics automatically.
 */
client.collectDefaultMetrics({
  register,
});
