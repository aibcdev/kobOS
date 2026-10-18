/**
 * @deprecated Regex-intent demo brain. Only `components/kob-talk/demo-workspace.tsx` (`/app?demo=1`) may use it;
 * live Talk runs through `lib/kob/talk/agent.ts`. Do not import from API routes.
 */
export * from "./types";
export * from "./intent";
export * from "./context";
export * from "./tools";
export * from "./voice";
export { runKobTurn, turnToChatMessage } from "./run";
