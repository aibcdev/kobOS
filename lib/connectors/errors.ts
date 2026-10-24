export type ConnectorErrorCode = "AUTH" | "RATE_LIMIT" | "NOT_FOUND" | "VALIDATION" | "PROVIDER" | "NETWORK";

/** Thrown by connector clients. AUTH and VALIDATION are not worth retrying. */
export class ConnectorError extends Error {
  constructor(
    readonly code: ConnectorErrorCode,
    message: string,
    readonly status?: number,
    readonly providerCode?: string,
    /** RATE_LIMIT: how long the provider asked us to wait (Retry-After). */
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ConnectorError";
  }

  get retriable(): boolean {
    return this.code !== "AUTH" && this.code !== "VALIDATION" && this.code !== "NOT_FOUND";
  }
}
