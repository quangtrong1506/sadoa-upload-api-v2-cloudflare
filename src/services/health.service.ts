const startedAt = Date.now();

export interface HealthStatus {
  status: "ok";
  uptimeMs: number;
  timestamp: string;
}

/**
 * Returns the current health snapshot of the service.
 * Extend with dependency checks (DB ping, cache reachability) as needed.
 */
export function getHealth(): HealthStatus {
  return {
    status: "ok",
    uptimeMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };
}
