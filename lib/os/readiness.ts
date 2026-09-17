import type { ReadinessChecks } from "@/lib/os/gates";
import { capabilityLabel } from "@/lib/os/gates";

export const WORKFLOW_SPECS = {
  hours: {
    INPUTS: "Google hours, website hours, restaurant canonical-source rule",
    SOURCE_OF_TRUTH: "Owner rule: website or Google",
    TRIGGERS: "Owner voice/Talk: make hours right; daily scan",
    DECISION_LOGIC: "Diff channels; pick canonical; update others",
    FORMULA: "match iff open, close, closedDates equal",
    CONFIDENCE_RULE: "Read-back equality, not HTTP 200",
    PERMISSION_RULE: "ASK unless AUTO and risk < 51 and reliability band allows",
    ACTION: "SET_HOURS / TEMPORARY_CLOSURE",
    EXTERNAL_SIDE_EFFECT: "Google listing, website hours, reservations if connected",
    VERIFICATION: "adapter.verify expected state",
    ROLLBACK: "restore previous hours payload",
    FAILURE_STATES: "token expired, partial channel fail, ambiguous location",
    AUDIT_DATA: "intent, canonical, execute payload, observed, owner message",
    VOICE_EQUIVALENT: "We're shut Monday / Make sure hours are right everywhere",
    SUCCESS_METRIC: "Verified hours actions / location / week",
  },
} as const;

export const HOURS_READINESS: ReadinessChecks = {
  dataReliable: true,
  endToEnd: true,
  failureStates: true,
  permissions: true,
  executes: true,
  verifies: true,
  audit: true,
  voice: true,
  monitoring: true,
  acceptance: true,
};

export const HOURS_LABEL = capabilityLabel(HOURS_READINESS, "BETA");

export const WASTE_EYE_READINESS: ReadinessChecks = {
  dataReliable: false,
  endToEnd: false,
  failureStates: true,
  permissions: true,
  executes: false,
  verifies: false,
  audit: true,
  voice: false,
  monitoring: true,
  acceptance: true,
};

export const WASTE_EYE_LABEL = capabilityLabel(WASTE_EYE_READINESS, "COMING_SOON");

export const POS_GUEST_LABEL = "COMING_SOON" as const;
