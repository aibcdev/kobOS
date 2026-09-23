export const TALK_PROVIDERS = ["GMAIL", "GOOGLE_CALENDAR"] as const;
export type TalkProvider = (typeof TALK_PROVIDERS)[number];
export type ConnectorState =
  | "disconnected"
  | "unverified"
  | "connected"
  | "reconnect"
  | "unavailable";
export type TalkConnector = {
  provider: TalkProvider;
  name: string;
  description: string;
  state: ConnectorState;
  checkedAt: string | null;
  hasAccount: boolean;
};
export type TalkSource = {
  title: string;
  url: string;
  provider: TalkProvider;
  checkedAt: string;
};
export type TalkActivity = {
  label: string;
  status: "complete" | "blocked";
  detail?: string;
};
export type TalkMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: TalkSource[];
  activity?: TalkActivity[];
  needsConnection?: TalkProvider[];
};
export function isTalkProvider(value: string): value is TalkProvider {
  return TALK_PROVIDERS.some((provider) => provider === value);
}
