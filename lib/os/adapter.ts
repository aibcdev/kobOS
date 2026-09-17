export type AuthResult = { ok: boolean; reason?: string };
export type ReadResult = { ok: boolean; data?: Record<string, unknown>; reason?: string };
export type ExecutionResult = {
  ok: boolean;
  payload?: Record<string, unknown>;
  httpOkNotProof?: boolean;
  reason?: string;
};
export type VerificationResult = {
  ok: boolean;
  observed?: Record<string, unknown>;
  matchesExpected: boolean;
  reason?: string;
};
export type HealthResult = {
  ok: boolean;
  lastSuccessAt?: string;
  lastFailAt?: string;
  errorCount?: number;
  reason?: string;
};

export interface IntegrationAdapter {
  authenticate(): Promise<AuthResult>;
  read(resource: string, query: Record<string, unknown>): Promise<ReadResult>;
  execute(action: string, payload: Record<string, unknown>): Promise<ExecutionResult>;
  verify(expectedState: Record<string, unknown>): Promise<VerificationResult>;
  health(): Promise<HealthResult>;
}
