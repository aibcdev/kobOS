import type {
  AutonomyLevel,
  AutonomyRule,
  ChatMessage,
  Finding,
  MemoryItem,
  Restaurant,
  Review,
} from "@/lib/kob/demo";
import { levelFor } from "@/lib/kob/demo";
import { toolNeededFor, type ToolId } from "@/lib/kob/integrations";
import {
  isOverridden,
  type HouseRules,
  type Overrides,
} from "@/lib/kob/house-rules";

export type WorkMutations = {
  approveSuggest?: boolean
  replyHighReviews?: boolean
  alignHours?: boolean
  queueMenu?: boolean
  addBookingLink?: boolean
  addMemory?: MemoryItem
  setAutonomy?: { id: string; level: AutonomyLevel }[]
};

export type ActResult = {
  kind: "handled" | "chat"
  reply: string
  actions?: ChatMessage["actions"]
  doneText?: string
  mutations: WorkMutations
};

function waitingJobs(findings: Finding[], autonomy: AutonomyRule[]) {
  return findings.filter((finding) => {
    if (finding.status !== "needs" || !finding.actionLabel) return false;
    const level = levelFor(finding, autonomy);
    return level !== "always-ask";
  });
}

export function narrateJobs(
  findings: Finding[],
  restaurant: Restaurant,
  autonomy: AutonomyRule[],
) {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const finding of findings) {
    if (finding.status !== "needs") continue;
    if (finding.ruleId && seen.has(finding.ruleId)) continue;
    if (finding.ruleId) seen.add(finding.ruleId);
    const level = levelFor(finding, autonomy);
    if (finding.ruleId === "hours") {
      lines.push(
        /not listed|not published/i.test(restaurant.hoursWebsite)
          ? `The website does not list hours. Directories disagree with each other. I'll wait for you to say which hours are true, then write them everywhere.`
          : `Google still says ${restaurant.hoursGoogle}. The website says ${restaurant.hoursWebsite}. I'll set both to match the website.`,
      );
    } else if (finding.ruleId === "menu") {
      lines.push(
        "The website menu still shows an old price. I'll queue it to match the printed one.",
      );
    } else if (finding.ruleId === "google-info") {
      lines.push(
        restaurant.bookingUrl
          ? `The booking link works on the site, but it isn't on Google. I'll add it.`
          : "Guests searching you on Google have no way to book. I'll add the link.",
      );
    } else if (finding.id === "r-low" || finding.ruleId === "reviews-low") {
      lines.push(
        "The wait complaint stays with you. I have not replied, and I have not offered a voucher.",
      );
    } else if (level === "always-ask") {
      lines.push(`${finding.headline} stays with you.`);
    } else {
      lines.push(finding.detail);
    }
  }
  return lines.join("\n\n");
}

export function doneSummary(findings: Finding[], autonomy: AutonomyRule[]) {
  const jobs = waitingJobs(findings, autonomy);
  const bits = jobs.map((finding) => {
    if (finding.ruleId === "hours") return "Hours aligned on Google and the site";
    if (finding.ruleId === "menu") return "Website menu queued to the printed one";
    if (finding.ruleId === "google-info") return "Booking link added on Google";
    if (finding.ruleId === "reviews-high") return "Five-star replies sent";
    return finding.headline;
  });
  if (!bits.length) return "Done. I'll keep watching.";
  return `Done.\n${bits.join(".\n")}.\nI'll keep watching.`;
}

function askActions(): ChatMessage["actions"] {
  return [
    { id: "approve-all", label: "Take them", kind: "approve" },
    { id: "review", label: "Tell me first", kind: "yes" },
  ];
}

export function actOnTalk(input: {
  text: string
  restaurant: Restaurant
  findings: Finding[]
  reviews: Review[]
  autonomy: AutonomyRule[]
  memory: MemoryItem[]
  connected?: Record<ToolId, boolean>
  houseRules?: HouseRules
  overrides?: Overrides
}): ActResult {
  const q = input.text.toLowerCase().trim();
  const { restaurant, findings, autonomy } = input;
  const connected = input.connected;
  const houseRules = input.houseRules;
  const overrides = input.overrides ?? {};

  const needed = toolNeededFor(input.text);

  if (/margin|profit|food cost|gp\b|gross|overpay|too much for/.test(q)) {
    return {
      kind: "handled",
      reply:
        "MARGIN\nI check three leaks: supplier prices vs house rate, dishes sold vs what you bought, and waste over your ignore line.\nI can run last night's demo invoice against dish counts now. Nothing goes to a supplier until you tap yes.",
      actions: [
        { id: "demo-invoice", label: "Run invoice vs till", kind: "yes" },
        { id: "ignore", label: "Leave it", kind: "ignore" },
      ],
      mutations: {},
    };
  }

  if (needed === "weather" && connected && !connected.weather) {
    return {
      kind: "handled",
      reply:
        "Weather is off. Open kitchen and turn it on if you want prep cuts. For margins, send a delivery note or tap the invoice.",
      actions: [{ id: "demo-invoice", label: "Check invoice vs till", kind: "yes" }],
      mutations: {},
    };
  }
  if (needed === "accounting" && connected && !connected.accounting) {
    return {
      kind: "handled",
      reply:
        "Invoice photos are free. Open kitchen, enable invoice photos, then send a delivery note or use the demo.",
      actions: [{ id: "demo-invoice", label: "Enable and run demo", kind: "yes" }],
      mutations: {},
    };
  }
  if (needed === "google" && connected && !connected.google) {
    return {
      kind: "handled",
      reply: "That job runs in Google. Open kitchen and connect it. Then I'll prepare the change.",
      mutations: {},
    };
  }
  if (needed === "website" && connected && !connected.website) {
    return {
      kind: "handled",
      reply: "That job runs on the website. Open kitchen and point KOB at the site.",
      mutations: {},
    };
  }

  if (/closing stock|fridge|stock count|cases of|kilos of/.test(q)) {
    return {
      kind: "handled",
      reply:
        "STOCK LOGGED\nSay the fridge and the counts. I store them for waste vs till. I have not changed a supplier order.",
      mutations: {
        addMemory: {
          id: `stock-${Date.now()}`,
          text: input.text,
          learned: "Closing stock from the floor.",
        },
      },
    };
  }

  if (/ice machine|leaking|repair|hvac|broken/.test(q)) {
    return {
      kind: "handled",
      reply:
        "MAINTENANCE DRAFTED\nI can log this and draft a note to your usual engineer. Not sent.",
      actions: [
        { id: "approve-all", label: "Queue the note", kind: "approve" },
        { id: "ignore", label: "Leave it", kind: "ignore" },
      ],
      doneText: "Done.\nMaintenance note queued. Not sent.",
      mutations: {},
    };
  }

  if (/running low|need more by|short on|out of lemons|out of/.test(q)) {
    return {
      kind: "handled",
      reply:
        "SHORTAGE\nI will not place an order until you approve. I can draft a supplier note from your last invoice lines.",
      actions: [
        { id: "demo-invoice", label: "Use last invoice prices", kind: "yes" },
        { id: "ignore", label: "Leave it", kind: "ignore" },
      ],
      mutations: {},
    };
  }

  if (/override|break (the )?rule|just for today/.test(q)) {
    return {
      kind: "handled",
      reply:
        "I can break a house rule for today only. Open kitchen, or tap Override today on the last alert.",
      actions: [{ id: "override-price", label: "Override price rule today", kind: "yes" }],
      mutations: {},
    };
  }
  const hoursLevel =
    autonomy.find((rule) => rule.id === "hours")?.level ?? "ask";
  const highLevel =
    autonomy.find((rule) => rule.id === "reviews-high")?.level ?? "handle";
  const menuLevel =
    autonomy.find((rule) => rule.id === "menu")?.level ?? "always-ask";
  const waiting = waitingJobs(findings, autonomy);

  if (
    /^(take them|go ahead|yes|do it|handle it|apply all|apply|send them|send it|send the replies|ok|okay)\.?$/i.test(
      q,
    )
  ) {
    if (!waiting.length) {
      return {
        kind: "handled",
        reply: "Nothing is waiting. I'll keep watching.",
        mutations: {},
      };
    }
    return {
      kind: "handled",
      reply: doneSummary(findings, autonomy),
      mutations: {
        approveSuggest: true,
        replyHighReviews: true,
        alignHours: waiting.some((f) => f.ruleId === "hours"),
        queueMenu: waiting.some((f) => f.ruleId === "menu"),
        addBookingLink: waiting.some((f) => f.ruleId === "google-info"),
      },
    };
  }

  if (
    /always (let )?kob (answer|handle|reply)|handle (4|four).*(5|five)|autopilot.*review|always handle (4|5|four|five)|5-star reviews on autopilot/.test(
      q,
    )
  ) {
    return {
      kind: "handled",
      reply: `I'll reply to 4 and 5 star reviews at ${restaurant.name} in your usual tone from now on. Complaints, refunds and prices still come to you.`,
      mutations: {
        setAutonomy: [{ id: "reviews-high", level: "handle" }],
        replyHighReviews: true,
      },
    };
  }

  if (/handle (the )?hours|hours on autopilot|always .*hours|take the hours/.test(q)) {
    return {
      kind: "handled",
      reply:
        "Hours are on autopilot. I'll keep Google, the website and the booking page true — and tell you when I move them.",
      mutations: {
        setAutonomy: [{ id: "hours", level: "handle" }],
        alignHours: true,
      },
    };
  }

  if (/never (offer )?a voucher|don't offer a voucher|do not offer a voucher|no voucher/.test(q)) {
    return {
      kind: "handled",
      reply:
        "Understood. I will not offer a voucher on a complaint unless you say so.",
      mutations: {
        setAutonomy: [{ id: "reviews-low", level: "always-ask" }],
        addMemory: {
          id: `mem-${Date.now()}`,
          text: "Never offer a voucher on a complaint.",
          learned: "Complaints come to you. No voucher unless you write it.",
        },
      },
    };
  }

  if (/never discount friday|don't discount friday|do not discount friday/.test(q)) {
    return {
      kind: "handled",
      reply:
        "Understood. Offers only Monday–Thursday, unless you ask. Friday and Saturday stay full price.",
      mutations: {
        setAutonomy: [{ id: "promos", level: "always-ask" }],
        addMemory: {
          id: `mem-${Date.now()}`,
          text: "Never discount Friday nights.",
          learned: "Offers only Monday–Thursday, unless you ask.",
        },
      },
    };
  }

  if (
    /^(remember|never |don't |do not |dont )/.test(q) ||
    q.includes("remember this") ||
    q.includes("keep that")
  ) {
    return {
      kind: "handled",
      reply: "Understood. I'll keep that and use it from now on.",
      mutations: {
        addMemory: {
          id: `mem-${Date.now()}`,
          text: input.text.replace(/^(remember:?\s*)/i, "").trim(),
          learned: "Taken from what you just told me.",
        },
      },
    };
  }

  if (/\breviews?\b/.test(q)) {
    if (connected && !connected.google) {
      return {
        kind: "handled",
        reply: "Reviews sit in Google. Connect Google in the kitchen sheet first.",
        mutations: {},
      };
    }
    if (/nearby|competitor|velocity|spike|neighbour|neighbor/.test(q)) {
      return {
        kind: "handled",
        reply:
          "I'll check nearby Google review speed for your city. Public watch only — no login. Want me to run it?",
        actions: [
          { id: "nearby-reviews", label: "Check nearby reviews", kind: "yes" },
          { id: "ignore", label: "Leave it", kind: "ignore" },
        ],
        mutations: {},
      };
    }
    if (highLevel === "handle") {
      return {
        kind: "handled",
        reply: `Already done. 4 and 5 star reviews at ${restaurant.name} are on autopilot. I replied overnight.\n\nOne guest complained about a wait. That stays with you — I have not offered a voucher.`,
        mutations: { replyHighReviews: true },
      };
    }
    return {
      kind: "handled",
      reply: `I'll draft the 5-stars in your tone and leave the complaint with you. Want me to send the easy ones now?`,
      actions: [
        ...(askActions() ?? []),
        { id: "nearby-reviews", label: "Check nearby reviews", kind: "yes" },
      ],
      doneText: "Done.\nFive-star replies sent.\nI'll keep watching.",
      mutations: {},
    };
  }

  if (/\bhours\b|we're closed|we are closed|bank holiday|closed monday/.test(q)) {
    if (connected && !connected.google) {
      return {
        kind: "handled",
        reply: "Hours live on Google. Connect it in the kitchen sheet, then I'll prepare the change.",
        mutations: {},
      };
    }
    if (hoursLevel === "handle") {
      return {
        kind: "handled",
        reply:
          "Hours are on autopilot. I'll update Google, the website and the booking page now.",
        mutations: { alignHours: true },
      };
    }
    if (hoursLevel === "always-ask") {
      return {
        kind: "handled",
        reply:
          "Hours are protected. I'll prepare the change everywhere and wait.",
        mutations: {},
      };
    }
    return {
      kind: "handled",
      reply: `I'll prepare the hours everywhere — Google, the website, bookings.\n\nGoogle still says ${restaurant.hoursGoogle}. The website says ${restaurant.hoursWebsite}. Nothing goes live until you say so.`,
      actions: [
        { id: "approve-all", label: "Apply hours", kind: "approve" },
        { id: "review", label: "Leave it", kind: "ignore" },
      ],
      doneText: "Done.\nHours aligned on Google and the site.\nI'll keep watching.",
      mutations: {},
    };
  }

  if (/\binvoice\b|\bwaste\b|leakage|\bsalmon\b|\bcheddar\b/.test(q)) {
    if (connected && !connected.accounting) {
      return {
        kind: "handled",
        reply:
          "Invoice photos are free. Open kitchen, enable invoice photos, then send a delivery photo or use the demo note.",
        mutations: {},
      };
    }
    const ignore = houseRules?.waste.ignoreGbp ?? 0;
    if (houseRules && !isOverridden(overrides, "waste") && ignore > 200) {
      return {
        kind: "handled",
        reply: `Your waste rule ignores small gaps. I'll only flag a real hole. Want the demo invoice anyway?`,
        actions: [{ id: "demo-invoice", label: "Use demo invoice", kind: "yes" }],
        mutations: {},
      };
    }
    return {
      kind: "handled",
      reply: "I'll read the delivery note against the till counts. Nothing texts the chef until you say so.",
      actions: [
        { id: "demo-invoice", label: "Use demo invoice", kind: "yes" },
        { id: "review", label: "Leave it", kind: "ignore" },
      ],
      mutations: {},
    };
  }

  if (/\bweather\b|\brain\b|forecast|\bstorm\b/.test(q)) {
    if (connected && !connected.weather) {
      return {
        kind: "handled",
        reply: "Turn on weather in the kitchen sheet. Then I'll propose prep — you still approve.",
        mutations: {},
      };
    }
    const strict = houseRules?.weather.level === "strict";
    return {
      kind: "handled",
      reply: strict
        ? "Weather is on. Your rule is strict — I'll cut salad hard if rain is in. Approve the prep note?"
        : "Weather is on. I'll propose a prep change. You approve. Nothing goes to the chef yet.",
      actions: [
        { id: "weather-prep", label: "Run weather prep", kind: "yes" },
        { id: "review", label: "Leave it", kind: "ignore" },
      ],
      mutations: {},
    };
  }

  if (/\bmenu\b|smashed eggs|website price/.test(q)) {
    if (connected && !connected.website) {
      return {
        kind: "handled",
        reply: "Save your website URL in Open kitchen first. Then I can check hours and menu.",
        mutations: {},
      };
    }
    if (menuLevel === "always-ask") {
      return {
        kind: "handled",
        reply:
          "I'll queue the website menu to match the printed one. Prices don't go public unless you move them to autopilot. Shall I queue it?",
        actions: [
          { id: "approve-all", label: "Queue the fix", kind: "approve" },
        ],
        doneText: "Done.\nWebsite menu queued to the printed one.\nI'll keep watching.",
        mutations: {},
      };
    }
    return {
      kind: "handled",
      reply: "I'll update the public menu to match the printed one now.",
      mutations: { queueMenu: true },
    };
  }

  if (/quiet|tuesday|table|fill/.test(q)) {
    return {
      kind: "handled",
      reply:
        "I'll write to previous guests from this night and put a Google post up with tonight's special — no Friday or Saturday discount. Shall I send it?",
      actions: [
        { id: "approve-all", label: "Prepare it", kind: "approve" },
        { id: "review", label: "Leave Tuesdays", kind: "ignore" },
      ],
      doneText:
        "Done.\nNote drafted for previous Tuesday guests.\nGoogle post ready with tonight's special.\nNothing public until you say so.",
      mutations: {},
    };
  }

  if (/google|listing/.test(q)) {
    return {
      kind: "handled",
      reply: narrateJobs(findings, restaurant, autonomy) ||
        "The listing looks true. I'll keep watching hours, the booking link and the categories.",
      actions: waiting.length ? askActions() : undefined,
      doneText: waiting.length ? doneSummary(findings, autonomy) : undefined,
      mutations: {},
    };
  }

  if (/what (are you|did you) (doing|do)|what's waiting|what is waiting|morning|brief/.test(q)) {
    const narrative = narrateJobs(findings, restaurant, autonomy);
    return {
      kind: "handled",
      reply: narrative
        ? `${narrative}\n\nSay the word and I'll take the jobs that are allowed.`
        : "The morning is clear. I'll keep watching.",
      actions: waiting.length ? askActions() : undefined,
      doneText: waiting.length ? doneSummary(findings, autonomy) : undefined,
      mutations: {},
    };
  }

  return {
    kind: "chat",
    reply: `I'll take that. I'll check Google, reviews and the site, do the work, and only stop where you've said I must. Want me to go ahead?`,
    actions: waiting.length
      ? [
          { id: "approve-all", label: "Take the morning jobs", kind: "approve" },
        ]
      : undefined,
    doneText: waiting.length ? doneSummary(findings, autonomy) : undefined,
    mutations: {},
  };
}
