import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

mkdirSync("compositions", { recursive: true });

const roles = {
  reviews: {
    id: "role-reviews",
    accent: "#e23c1a",
    chip: "Google",
    steps: [
      { who: "owner", text: "Came back for the third time. Still the reason we cross town." },
      { who: "kob", text: "Replied in your usual tone." },
      { who: "done", text: "Sent" },
    ],
  },
  google: {
    id: "role-google",
    accent: "#4285F4",
    chip: "Google · Site",
    steps: [
      { who: "kob", text: "Google says you close at 4pm. The website says 5pm." },
      { who: "owner", text: "Set both to 5pm." },
      { who: "done", text: "Listing matches" },
    ],
  },
  website: {
    id: "role-website",
    accent: "#111111",
    chip: "Website",
    steps: [
      { who: "owner", text: "Great brunch. Website still has the old price on the smashed eggs." },
      { who: "kob", text: "Printed menu is right. Queuing the website change." },
      { who: "done", text: "Menu change queued" },
    ],
  },
  kitchen: {
    id: "role-kitchen",
    accent: "#d85a3a",
    chip: "Invoice · Weather",
    steps: [
      { who: "owner", text: "Delivery photo. Cheddar line looks high." },
      { who: "kob", text: "House rate is lower. Waste vs covers flagged. Draft supplier note — or leave it." },
      { who: "kob", text: "Forecast 12°C. Salad usually drops on cold Tuesdays. Cut prep, or dismiss." },
      { who: "done", text: "Waiting on you" },
    ],
  },
};

function html(roleKey, role) {
  const bubbles = role.steps
    .map((step, i) => {
      const avatar =
        step.who === "owner"
          ? `<img class="avatar" src="assets/owner-face.jpg" alt="" />`
          : step.who === "done"
            ? `<span class="avatar check">✓</span>`
            : `<span class="avatar orb"></span>`;
      const chip =
        i === 1 && step.who === "kob"
          ? `<span class="chip" style="color:${role.accent}">${role.chip}</span>`
          : "";
      return `
      <article class="bubble" id="b${i}">
        ${avatar}
        <div class="body">
          ${chip}
          <p>${step.text}</p>
        </div>
      </article>`;
    })
    .join("\n");

  const tweens = role.steps
    .map((_, i) => `tl.from("#b${i}", { y: 28, opacity: 0, duration: 0.55, ease: "power3.out" }, ${0.35 + i * 1.35});`)
    .join("\n      ");

  const duration = Math.max(7, 1.2 + role.steps.length * 1.4);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1350" />
    <title>KOB ${roleKey}</title>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; overflow: hidden; background: #ecece9; }
      #root {
        position: relative; width: 100%; height: 100%;
        font-family: "Instrument Sans", system-ui, sans-serif;
        background: #ecece9; color: #111;
      }
      .stage {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        padding: 72px 64px;
      }
      .stack {
        width: 100%; max-width: 820px;
        display: flex; flex-direction: column; gap: 22px;
        position: relative;
      }
      .stack::before {
        content: "";
        position: absolute; left: 27px; top: 36px; bottom: 36px;
        width: 2px; background: #d4d4d1;
      }
      .bubble {
        position: relative; z-index: 1;
        display: flex; gap: 18px; align-items: flex-start;
        background: #fff; border-radius: 28px; padding: 22px 24px;
        box-shadow: 0 10px 40px -24px rgba(17,17,17,0.35);
      }
      .avatar {
        width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
        object-fit: cover; background: #ddd;
      }
      .avatar.orb {
        background:
          radial-gradient(circle at 32% 22%, #b8f0ce 0%, transparent 36%),
          radial-gradient(circle at 50% 48%, #3ecf78 0%, #1f8a4d 44%, #0b3d22 100%);
        box-shadow: inset 0 -8px 14px rgba(6,28,14,0.35);
      }
      .avatar.check {
        display: inline-flex; align-items: center; justify-content: center;
        background: #2f9e5f; color: #fff; font-size: 26px; font-weight: 600;
      }
      .body { min-width: 0; flex: 1; padding-top: 6px; }
      .chip {
        display: inline-block; font-size: 18px; font-weight: 600;
        margin-bottom: 8px; letter-spacing: -0.02em;
      }
      .body p { font-size: 28px; line-height: 1.35; letter-spacing: -0.025em; font-weight: 500; }
      .mark {
        position: absolute; top: 48px; right: 56px;
        font-size: 18px; font-weight: 600; color: #e23c1a; letter-spacing: 0.04em;
      }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${role.id}" data-start="0" data-width="1080" data-height="1350" data-duration="${duration}">
      <section class="clip stage" data-start="0" data-duration="${duration}">
        <span class="mark">LANGOSTERIA*</span>
        <div class="stack">
          ${bubbles}
        </div>
      </section>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${tweens}
      window.__timelines["${role.id}"] = tl;
    </script>
  </body>
</html>`;
}

for (const [key, role] of Object.entries(roles)) {
  writeFileSync(join("compositions", `${key}.html`), html(key, role));
}
writeFileSync("index.html", html("reviews", roles.reviews));
console.log("Wrote compositions for", Object.keys(roles).join(", "));
