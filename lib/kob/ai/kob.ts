export type TalkToKobInput = {
  restaurantName: string;
  ownerName: string;
  context: string;
  memory: string[];
  autonomy?: string[];
  messages: { role: "owner" | "kob"; text: string }[];
};

export type TalkToKobResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function talkToKob({
  data,
}: {
  data: TalkToKobInput;
}): Promise<TalkToKobResult> {
  const res = await fetch("/api/kob/talk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json() as Promise<TalkToKobResult>;
}
