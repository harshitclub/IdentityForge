export interface LogContext {
  event: string;

  userId?: string;
  email?: string;

  operation?: string;

  requestId?: string;
  ipAddress?: string;

  service?: string;
  jobId?: string;

  error?: unknown;

  [key: string]: unknown;
}
