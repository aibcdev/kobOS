export type AuditRuntimeEnvIssue = {
  code: "missing_places" | "missing_gemini";
  error: string;
};

export function validateAuditRuntimeEnv(): { ok: true } | { ok: false; issue: AuditRuntimeEnvIssue } {
  if (!process.env.GOOGLE_PLACES_API_KEY?.trim()) {
    return {
      ok: false,
      issue: {
        code: "missing_places",
        error:
          "Google Places is not configured. Add GOOGLE_PLACES_API_KEY to run UK competitor scans.",
      },
    };
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return {
      ok: false,
      issue: {
        code: "missing_gemini",
        error: "Gemini is not configured. Add GEMINI_API_KEY to score audit benchmarks.",
      },
    };
  }
  return { ok: true };
}
