"use client";

import { useState } from "react";
import { Button } from "@/components/kob-ui/button";
import { Input } from "@/components/kob-ui/input";
import { TOOLS, TOOL_GROUPS, type ToolId } from "@/lib/kob/integrations";
import { EMPTY_RULES, QUESTIONS, RULE_ORDER, type RuleId } from "@/lib/kob/house-rules";
import { useKobStore } from "@/lib/kob/store";

export function KitchenSheet() {
  const open = useKobStore((s) => s.sheetOpen);
  const setSheetOpen = useKobStore((s) => s.setSheetOpen);
  const holding = useKobStore((s) => s.holding);
  const findings = useKobStore((s) => s.findings);
  const houseRules = useKobStore((s) => s.houseRules);
  const setHouseRule = useKobStore((s) => s.setHouseRule);
  const truthLog = useKobStore((s) => s.truthLog);
  const connected = useKobStore((s) => s.connected);
  const connectTool = useKobStore((s) => s.connectTool);
  const websiteUrl = useKobStore((s) => s.websiteUrl);
  const setWebsiteUrl = useKobStore((s) => s.setWebsiteUrl);
  const weatherCity = useKobStore((s) => s.weatherCity);
  const setWeatherCity = useKobStore((s) => s.setWeatherCity);
  const notifyEmail = useKobStore((s) => s.notifyEmail);
  const setNotifyEmail = useKobStore((s) => s.setNotifyEmail);
  const onboardLens = useKobStore((s) => s.onboardLens);
  const [siteDraft, setSiteDraft] = useState(websiteUrl);
  const [cityDraft, setCityDraft] = useState(weatherCity);
  const [emailDraft, setEmailDraft] = useState(notifyEmail);

  if (!open) return null;

  const watch = [
    ...holding,
    ...findings
      .filter((f) => f.status === "needs")
      .map((f) => ({ id: f.id, text: f.headline })),
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-espresso/40">
      <button
        type="button"
        className="flex-1"
        aria-label="Close kitchen"
        onClick={() => setSheetOpen(false)}
      />
      <div className="max-h-[78%] overflow-y-auto rounded-t-[1.75rem] bg-bone px-5 py-5 shadow-soft">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-line-strong" />
        <h2 className="font-display text-2xl font-medium">Kitchen</h2>
        <p className="mt-1 text-sm text-muted">
          {onboardLens
            ? `Starting with ${onboardLens.firstJobLabel}. Phone and the till are Coming soon.`
            : "Free tools work now. Paid partners show Soon. You still approve."}
        </p>

        <section className="mt-6">
          <h3 className="text-sm font-medium">Holding</h3>
          <ul className="mt-2 space-y-2">
            {watch.length ? (
              watch.map((item) => (
                <li key={item.id} className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink">
                  {item.text}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted">Nothing in the brain yet.</li>
            )}
          </ul>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-medium">House rules</h3>
          <ul className="mt-2 space-y-3">
            {RULE_ORDER.map((id: RuleId) => (
              <li key={id} className="rounded-2xl bg-cream px-4 py-3">
                <p className="text-sm font-medium">{QUESTIONS[id].title}</p>
                <p className="mt-1 text-sm text-ink">
                  {houseRules[id].answer || "Not set. Answer in Talk."}
                </p>
                {houseRules[id].answer ? (
                  <button
                    type="button"
                    className="mt-2 text-xs text-muted underline"
                    onClick={() => setHouseRule(id, { ...EMPTY_RULES[id] })}
                  >
                    Clear — ask again in Talk
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-medium">Connect</h3>
          <ul className="mt-3 space-y-2">
            <li className="rounded-2xl bg-paper px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    Phone
                    <span className="ml-2 text-[0.65rem] font-normal text-subtle">Soon</span>
                  </p>
                  <p className="text-xs text-muted">KOB will not take calls yet.</p>
                </div>
                <p className="shrink-0 text-xs text-subtle">Coming soon</p>
              </div>
            </li>
          </ul>
          {TOOL_GROUPS.map((group) => (
            <div key={group} className="mt-4">
              <p className="text-xs font-medium text-muted">{group}</p>
              <ul className="mt-2 space-y-2">
                {TOOLS.filter((t) => t.group === group).map((tool) => {
                  const on = connected[tool.id as ToolId];
                  return (
                    <li key={tool.id} className="rounded-2xl bg-paper px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {tool.name}
                            {tool.id === "pos" || !tool.free ? (
                              <span className="ml-2 text-[0.65rem] font-normal text-subtle">
                                Soon
                              </span>
                            ) : (
                              <span className="ml-2 text-[0.65rem] font-normal text-sage">
                                Free
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted">
                            {tool.id === "pos"
                              ? "We do not replace your till. Partner login is Coming soon."
                              : tool.does}
                          </p>
                          <p className="mt-1 text-[0.7rem] text-subtle">
                            {tool.vendors.join(" · ")}
                          </p>
                        </div>
                        {tool.free ? (
                          on ? (
                            <p className="shrink-0 text-xs text-sage">
                              {tool.id === "google" ? "Watch public" : "Watching"}
                            </p>
                          ) : tool.id === "google" ||
                            tool.id === "accounting" ||
                            tool.id === "weather" ? (
                            <Button size="sm" onClick={() => connectTool(tool.id)}>
                              {tool.id === "google" ? "Watch public Google" : tool.connect}
                            </Button>
                          ) : null
                        ) : (
                          <p className="shrink-0 text-xs text-subtle">
                            {tool.soonNote ?? "Reconnect / Coming next"}
                          </p>
                        )}
                      </div>

                      {tool.id === "website" ? (
                        <form
                          className="mt-3 flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            setWebsiteUrl(siteDraft);
                          }}
                        >
                          <Input
                            value={siteDraft}
                            onChange={(e) => setSiteDraft(e.target.value)}
                            placeholder="https://your-restaurant.com"
                            aria-label="Website URL"
                          />
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                        </form>
                      ) : null}

                      {tool.id === "weather" ? (
                        <form
                          className="mt-3 flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            setWeatherCity(cityDraft);
                            connectTool("weather");
                          }}
                        >
                          <Input
                            value={cityDraft}
                            onChange={(e) => setCityDraft(e.target.value)}
                            placeholder="Cape Town"
                            aria-label="Weather city"
                          />
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                        </form>
                      ) : null}

                      {tool.id === "email" ? (
                        <form
                          className="mt-3 flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            setNotifyEmail(emailDraft);
                          }}
                        >
                          <Input
                            type="email"
                            value={emailDraft}
                            onChange={(e) => setEmailDraft(e.target.value)}
                            placeholder="you@restaurant.com"
                            aria-label="Brief email"
                          />
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                        </form>
                      ) : null}

                      {on && tool.id === "website" && websiteUrl ? (
                        <p className="mt-2 truncate text-xs text-ink">{websiteUrl}</p>
                      ) : null}
                      {on && tool.id === "weather" ? (
                        <p className="mt-2 text-xs text-ink">City: {weatherCity}</p>
                      ) : null}
                      {on && tool.id === "email" && notifyEmail ? (
                        <p className="mt-2 truncate text-xs text-ink">{notifyEmail}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-6 pb-4">
          <h3 className="text-sm font-medium">Truth log</h3>
          <p className="mt-1 text-xs text-muted">Only jobs you approved. No made-up savings.</p>
          <ul className="mt-2 space-y-2">
            {truthLog.length ? (
              truthLog.map((row) => (
                <li key={row.id} className="text-sm text-ink">
                  {new Date(row.at).toLocaleDateString("en-GB")} · {row.text}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted">Nothing approved yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
