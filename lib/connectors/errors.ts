export type ConnectorErrorCode = "AUTH" | "RATE_LIMIT" | "NOT_FOUND" | "VALIDATION" | "PROVIDER" | "NETWORK";

/** Thrown by connector clients. AUTH and VALIDATION are not worth retrying. */
export class ConnectorError extends Error {
  constructor(
    readonly code: ConnectorErrorCode,
    message: string,
    readonly status?: number,
    readonly providerCode?: string,
  ) {
    super(message);
    this.name = "ConnectorError";
  }

  get retriable(): boolean {
    return this.code !== "AUTH" && this.code !== "VALIDATION" && this.code !== "NOT_FOUND";
  }
}
