"use client";

import { useState } from "react";
import { Button } from "@/components/kob-ui/button";
import { Input } from "@/components/kob-ui/input";
import { TOOLS, TOOL_GROUPS, type ToolId } from "@/lib/kob/integrations";
import { useKobStore } from "@/lib/kob/store";

export function IntegrationsPane() {
  const connected = useKobStore((s) => s.connected);
  const connectTool = useKobStore((s) => s.connectTool);
  const websiteUrl = useKobStore((s) => s.websiteUrl);
  const setWebsiteUrl = useKobStore((s) => s.setWebsiteUrl);
  const weatherCity = useKobStore((s) => s.weatherCity);
  const setWeatherCity = useKobStore((s) => s.setWeatherCity);
  const notifyEmail = useKobStore((s) => s.notifyEmail);
  const setNotifyEmail = useKobStore((s) => s.setNotifyEmail);
  const setPane = useKobStore((s) => s.setPane);
  const [siteDraft, setSiteDraft] = useState(websiteUrl);
  const [cityDraft, setCityDraft] = useState(weatherCity);
  const [emailDraft, setEmailDraft] = useState(notifyEmail);

  const freeOn =
    connected.google ||
    connected.website ||
    connected.weather ||
    connected.email ||
    connected.accounting;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-8">
      <div>
        <h1 className="font-display text-3xl font-medium">Connect</h1>
        <p className="mt-2 max-w-xl text-ink">
          Add KOB to the tools you already have. Free tools work now. Paid
          partners show Soon. Talk is how you approve.
        </p>
      </div>

      {TOOL_GROUPS.map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="text-sm font-medium text-muted">{group}</h2>
          {TOOLS.filter((t) => t.group === group).map((tool) => {
            const on = connected[tool.id as ToolId];
            return (
              <article key={tool.id} className="rounded-[1.75rem] bg-cream p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {tool.name}
                      {tool.free ? (
                        <span className="ml-2 text-xs font-normal text-sage">Free</span>
                      ) : (
                        <span className="ml-2 text-xs font-normal text-subtle">Soon</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted">{tool.does}</p>
                    <p className="mt-2 text-xs text-subtle">{tool.vendors.join(" · ")}</p>
                  </div>
                  {tool.free ? (
                    on ? (
                      <p className="text-sm text-sage">On</p>
                    ) : tool.id === "google" ||
                      tool.id === "accounting" ||
                      tool.id === "weather" ? (
                      <Button size="sm" onClick={() => connectTool(tool.id)}>
                        {tool.connect}
                      </Button>
                    ) : (
                      <p className="text-sm text-muted">Save below</p>
                    )
                  ) : (
                    <p className="text-sm text-subtle">{tool.soonNote ?? "Soon"}</p>
                  )}
                </div>

                {tool.id === "website" ? (
                  <form
                    className="mt-4 flex gap-2"
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
                    className="mt-4 flex gap-2"
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
                    className="mt-4 flex gap-2"
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
                  <p className="mt-3 truncate text-sm text-ink">{websiteUrl}</p>
                ) : null}
                {on && tool.id === "weather" ? (
                  <p className="mt-3 text-sm text-ink">City: {weatherCity}</p>
                ) : null}
                {on && tool.id === "email" && notifyEmail ? (
                  <p className="mt-3 truncate text-sm text-ink">{notifyEmail}</p>
                ) : null}
                {on && tool.free && !["website", "weather", "email"].includes(tool.id) ? (
                  <p className="mt-4 text-sm text-ink">On. You still approve anything public.</p>
                ) : null}
              </article>
            );
          })}
        </section>
      ))}

      {freeOn ? (
        <Button onClick={() => setPane("kob")}>Back to Talk</Button>
      ) : (
        <p className="text-sm text-muted">
          Turn on any Free tool to start. Paid partners come later.
        </p>
      )}
    </div>
  );
}
