// Generates compositions/frames/*.html and index.html for the KOB 60s demo.
// Cue times inside each frame are seconds from that frame's start, taken from
// the George take's word alignment (voice starts at 0.3s on the master timeline).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "compositions/frames");
mkdirSync(OUT, { recursive: true });

const FONTS = `@font-face{font-family:SuisseIntl;src:url("assets/fonts/captured-69b9330c8b70142e4e5f7dba_SuisseIntl-Regular.woff2")format("woff2");font-weight:400}
@font-face{font-family:SuisseIntl;src:url("assets/fonts/captured-69b9330c8b70142e4e5f7daf_SuisseIntl-Medium.woff2")format("woff2");font-weight:500}
@font-face{font-family:SuisseIntl;src:url("assets/fonts/captured-69b9330c8b70142e4e5f7db5_SuisseIntl-Bold.woff2")format("woff2");font-weight:600}
@font-face{font-family:STKBureauSans;src:url("assets/fonts/captured-69b9330c8b70142e4e5f8364_STKBureauSans-Regular.woff2")format("woff2");font-weight:400}
@font-face{font-family:STKBureauSans;src:url("assets/fonts/captured-69b9330c8b70142e4e5f8363_STKBureauSans-SemiBold.woff2")format("woff2");font-weight:600}`;

const css = (c) => `
#root{position:absolute;inset:0;overflow:hidden;font-family:SuisseIntl,Helvetica,Arial,sans-serif;color:#111}
.abs{position:absolute}
.fill{position:absolute;inset:0}
.bloom{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(168,255,46,.55),rgba(168,255,46,0))}
.kt{font-family:STKBureauSans,sans-serif;font-weight:600;letter-spacing:-0.035em;line-height:1.04}
.wi{display:inline-block;will-change:transform}
.row{display:flex;align-items:center}
.card{background:#fff;border:1px solid rgba(17,17,17,.08);border-radius:28px;box-shadow:0 24px 70px rgba(17,17,17,.09)}
.muted{color:#5c5c5c}
.pill{display:inline-flex;align-items:center;border-radius:999px;font-weight:600}
.orb{position:relative;border-radius:50%;overflow:hidden;flex-shrink:0;box-shadow:inset 0 -14px 26px rgba(6,28,14,.45),0 18px 40px -18px rgba(17,80,40,.55)}
.orb i{position:absolute;display:block}
.orb .f{inset:0;background:radial-gradient(circle at 32% 18%,#9be7b8 0%,transparent 38%),radial-gradient(circle at 70% 78%,#0d3d22 0%,transparent 48%),radial-gradient(circle at 50% 45%,#3ecf78 0%,#1f8a4d 42%,#0b3d22 100%)}
.orb .b{left:-20%;right:-20%;top:14%;height:28%;background:linear-gradient(180deg,transparent,rgba(210,255,230,.15) 20%,rgba(255,255,255,.85) 48%,rgba(180,255,210,.35) 62%,transparent);opacity:.55}
.orb .s{width:38%;height:22%;left:10%;top:11%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95) 0%,transparent 70%);filter:blur(2px)}
.orb .r{inset:0;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}
.wordmark{font-family:STKBureauSans;font-weight:600;letter-spacing:-.04em;line-height:1}
.stars{letter-spacing:2px}
.finger{position:absolute;width:64px;height:64px;border-radius:50%;background:rgba(17,17,17,.22);border:2px solid rgba(255,255,255,.7)}
.ripple{position:absolute;width:64px;height:64px;border-radius:50%;border:3px solid rgba(17,17,17,.35)}
`;

const orb = (px, id = "") =>
  `<div class="orb"${id ? ` id="${id}"` : ""} style="width:${px}px;height:${px}px"><i class="f"></i><i class="b"></i><i class="s"></i><i class="r"></i></div>`;

// Runtime helpers available to every frame script.
const HELPERS = `
var R=document.querySelector('[data-composition-id="__ID__"]');
function $(s){return R.querySelector(s);} function $$(s){return Array.prototype.slice.call(R.querySelectorAll(s));}
function split(sel){var el=typeof sel==='string'?$(sel):sel;var ws=el.textContent.trim().split(/\\s+/);el.innerHTML=ws.map(function(w){return '<span class="wi">'+w+'</span>';}).join(' ');return Array.prototype.slice.call(el.querySelectorAll('.wi'));}
function chars(sel){var el=typeof sel==='string'?$(sel):sel;var t=el.textContent;el.innerHTML=t.split('').map(function(ch){return '<span class="ch" style="opacity:0">'+(ch===' '?'&nbsp;':ch)+'</span>';}).join('');return Array.prototype.slice.call(el.querySelectorAll('.ch'));}
var tl=gsap.timeline({paused:true});
function wordsIn(ws,t,o){o=o||{};tl.fromTo(ws,{opacity:0,y:o.y||46,scale:o.s||1.12,filter:'blur(10px)'},{opacity:1,y:0,scale:1,filter:'blur(0px)',duration:o.d||0.55,stagger:o.st||0.07,ease:'power3.out'},t);}
function typeIn(cs,t,dur){tl.to(cs,{opacity:1,duration:0.01,stagger:dur/cs.length,ease:'none'},t);}
function count(el,to,t,dur){var o={v:0};tl.to(o,{v:to,duration:dur,ease:'power2.out',onUpdate:function(){el.textContent=Math.round(o.v);}},t);}
function tap(f,rp,t){tl.fromTo(f,{opacity:0,scale:1.4},{opacity:1,scale:1,duration:0.25,ease:'power2.out'},t-0.3);tl.to(f,{scale:0.8,duration:0.08},t);tl.to(f,{scale:1,duration:0.15},t+0.08);tl.fromTo(rp,{opacity:0.9,scale:0.6},{opacity:0,scale:2.6,duration:0.6,ease:'power2.out'},t);tl.to(f,{opacity:0,duration:0.25},t+0.4);}
`;

const frames = [];
function frame(file, id, dur, body, script, extraCss = "") {
  frames.push({ file, id, dur });
  writeFileSync(
    join(OUT, file),
    `<!doctype html>
<html lang="en-GB">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
${FONTS}
${css(id)}
${extraCss}
      </style>
      <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${dur}">
        <div id="${id}-ground" class="clip" data-start="0" data-duration="${dur}" data-track-index="0" style="position:absolute;inset:0;background:#fff"></div>
${body}
      </div>
      <script>
(function(){
${HELPERS.replace("__ID__", id)}
${script}
tl.set({}, {}, ${dur});
window.__timelines["${id}"] = tl;
})();
      </script>
    </template>
  </body>
</html>
`,
  );
}

const bloom = (id, style) => `<div class="bloom" id="${id}" style="${style}"></div>`;

/* ───────────── 01 — Hook (0–3.0) ───────────── */
frame(
  "01-hook.html",
  "f01-hook",
  3.0,
  `
${bloom("f01-bl", "left:-560px;top:-700px;width:1600px;height:1300px")}
<div id="f01-g" class="fill" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
  <div id="f01-a" class="kt" style="font-size:92px">You didn't open a restaurant to manage</div>
  <div style="position:relative;margin-top:22px">
    <div id="f01-hl" class="abs" style="left:-30px;right:-30px;top:58%;height:44%;background:#a8ff2e;border-radius:12px"></div>
    <div id="f01-b" class="kt" style="position:relative;font-size:230px;letter-spacing:-.05em">Google.</div>
  </div>
</div>`,
  `
tl.fromTo('#f01-bl',{x:0,y:0},{x:260,y:120,duration:3,ease:'none'},0);
wordsIn(split('#f01-a'),0.05,{st:0.13});
tl.fromTo('#f01-b',{opacity:0,scale:1.6,filter:'blur(16px)'},{opacity:1,scale:1,filter:'blur(0px)',duration:0.45,ease:'expo.out'},1.95);
tl.fromTo('#f01-hl',{scaleX:0,transformOrigin:'0% 50%'},{scaleX:1,duration:0.4,ease:'power3.inOut'},2.2);
tl.to('#f01-g',{scale:1.18,opacity:0,filter:'blur(14px)',duration:0.28,ease:'power2.in'},2.72);
`,
);

/* ───────────── 02 — Two worlds (3.0–7.5) ───────────── */
const ticket = (i, lines) =>
  `<div class="tk abs" id="f02-tk${i}" style="left:${100 + (i % 2) * 400}px;top:${150 + Math.floor(i / 2) * 210 + (i % 2) * 60}px;width:360px;background:#fffdf6;border-radius:6px;padding:24px 26px;font-family:'Fragment Mono',ui-monospace,Menlo,monospace;font-size:24px;line-height:1.5;color:#111;box-shadow:0 14px 30px rgba(0,0,0,.35)">${lines}</div>`;
const result = (i, name, rating, meta, state, bad) =>
  `<div class="res card abs" id="f02-r${i}" style="left:${0}px;top:${170 + i * 150}px;width:660px;height:126px;padding:22px;display:flex;gap:20px;align-items:center;border-radius:24px">
     <div style="width:82px;height:82px;border-radius:16px;background:${["linear-gradient(135deg,#e9b872,#b5651d)", "linear-gradient(135deg,#c0392b,#6e2c00)", "linear-gradient(135deg,#f6d365,#fda085)"][i]}"></div>
     <div style="flex:1"><div style="font-weight:600;font-size:27px">${name}</div><div class="muted" style="font-size:20px;margin-top:4px"><span class="stars">★</span> ${rating} · ${meta}</div></div>
     <div style="font-weight:600;font-size:20px;color:${bad ? "#c13515" : "#2f9e5f"}">${state}</div>
   </div>`;
frame(
  "02-two-worlds.html",
  "f02-two-worlds",
  4.5,
  `
<div id="f02-L" class="abs" style="left:0;top:0;width:960px;height:1080px;background:#111;overflow:hidden">
  <div class="abs" style="left:110px;top:70px;font-size:22px;font-weight:600;letter-spacing:.14em;color:#a8ff2e">YOU · ON THE PASS</div>
  ${ticket(0, "TABLE 12<br>2× Sunday roast<br>1× Beef dripping")}
  ${ticket(1, "TABLE 4<br>3× Lamb shoulder<br>1× Sticky toffee")}
  ${ticket(2, "TABLE 9<br>2× Pork chop<br>2× Negroni")}
  ${ticket(3, "TABLE 15<br>4× Fish pie<br>1× Bread basket")}
  ${ticket(4, "TABLE 2<br>1× Whole chicken<br>2× Affogato")}
  ${ticket(5, "TABLE 7<br>2× Onglet<br>1× Chips")}
  <div id="f02-cap" class="kt abs" style="left:110px;bottom:90px;font-size:64px;color:#fff">On the pass.</div>
</div>
<div id="f02-Rp" class="abs" style="left:0;top:0;width:1920px;height:1080px;background:#fff;overflow:hidden">
  ${bloom("f02-bl", "right:-600px;bottom:-760px;width:1500px;height:1300px")}
  <div class="abs" style="left:150px;top:70px;font-size:22px;font-weight:600;letter-spacing:.14em;color:#1f7a48">YOUR GUESTS · ONLINE</div>
  <div id="f02-list" class="abs" style="left:150px;top:0;width:660px;height:1080px">
    <div class="card abs" id="f02-search" style="left:0;top:150px;width:660px;height:96px;border-radius:48px;display:flex;align-items:center;gap:18px;padding:0 34px;font-size:32px">
      <span style="font-size:30px">⌕</span><span id="f02-q">peckham restaurants</span><span id="f02-caret" style="width:3px;height:36px;background:#111;display:inline-block"></span>
    </div>
    <div class="abs" style="left:0;top:110px;width:660px">
      ${result(0, "Grove Kitchen", "4.7", "Neighbourhood · 0.3 mi", "Open", false)}
      ${result(1, "The Juniper", "4.1", "Modern British · 0.4 mi", "Closed", true)}
      ${result(2, "Southover Arms", "4.6", "Pub · 0.6 mi", "Open", false)}
    </div>
  </div>
</div>`,
  `
tl.fromTo('#f02-L',{yPercent:-100},{yPercent:0,duration:0.5,ease:'expo.out'},0);
tl.fromTo('#f02-Rp',{x:960,yPercent:100},{x:960,yPercent:0,duration:0.5,ease:'expo.out'},0);
$$('.tk').forEach(function(t,i){tl.fromTo(t,{y:-520,rotation:(i%2?6:-5),opacity:0},{y:0,rotation:(i%2?3:-2)+i*0.6,opacity:1,duration:0.45,ease:'back.out(1.3)'},0.35+i*0.32);});
tl.to('.tk',{x:'+=6',duration:0.06,yoyo:true,repeat:9,ease:'none'},2.2);
wordsIn(split('#f02-cap'),1.0,{st:0.1});
var q=chars('#f02-q'); tl.set('#f02-q',{opacity:1},0); typeIn(q,0.6,1.0);
tl.to('#f02-caret',{opacity:0,duration:0.01,yoyo:true,repeat:7},0.4);
tl.fromTo('.res',{opacity:0,y:60},{opacity:1,y:0,duration:0.5,stagger:0.18,ease:'power3.out'},1.85);
tl.to('#f02-L',{xPercent:-100,duration:0.7,ease:'expo.inOut'},3.6);
tl.to('#f02-Rp',{x:0,duration:0.7,ease:'expo.inOut'},3.6);
tl.to('#f02-list',{x:480-150+150,duration:0.7,ease:'expo.inOut'},3.6);
tl.to('#f02-search',{opacity:0,y:-40,duration:0.35},3.7);
`,
);

/* ───────────── 03 — What guests find (7.5–17.3) ───────────── */
frame(
  "03-what-they-find.html",
  "f03-find",
  9.8,
  `
${bloom("f03-bl", "right:-600px;bottom:-760px;width:1500px;height:1300px")}
<div id="f03-list" class="abs" style="left:630px;top:0;width:660px;height:1080px">
  <div class="abs" style="left:0;top:110px;width:660px">
    ${["Grove Kitchen|4.7|Open|0", "The Juniper|4.1|Closed|1", "Southover Arms|4.6|Open|0"]
      .map((s, i) => {
        const [n, r, st, bad] = s.split("|");
        return `<div class="card abs f03-res" id="f03-r${i}" style="left:0;top:${170 + i * 150}px;width:660px;height:126px;padding:22px;display:flex;gap:20px;align-items:center;border-radius:24px">
      <div style="width:82px;height:82px;border-radius:16px;background:${["linear-gradient(135deg,#e9b872,#b5651d)", "linear-gradient(135deg,#c0392b,#6e2c00)", "linear-gradient(135deg,#f6d365,#fda085)"][i]}"></div>
      <div style="flex:1"><div style="font-weight:600;font-size:27px">${n}</div><div class="muted" style="font-size:20px;margin-top:4px">★ ${r} · Peckham</div></div>
      <div style="font-weight:600;font-size:20px;color:${bad === "1" ? "#c13515" : "#2f9e5f"}">${st}</div></div>`;
      })
      .join("")}
  </div>
</div>
<div id="f03-q" class="kt abs" style="left:0;right:0;top:120px;text-align:center;font-size:96px">And what do they find?</div>

<div id="f03-rev" class="card abs" style="left:240px;top:250px;width:880px;padding:46px 50px;border-radius:36px">
  <div class="row" style="gap:18px"><div style="width:64px;height:64px;border-radius:50%;background:#e8d5c4;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:28px">E</div>
    <div><div style="font-weight:600;font-size:28px">Emma R.</div><div style="font-size:26px;color:#111" class="stars">★★☆☆☆ <span class="muted" style="font-size:20px;letter-spacing:0">· 6 days ago</span></div></div></div>
  <div style="font-size:34px;line-height:1.4;margin-top:26px">Waited 40 minutes for our mains and nobody said a word. Food was good, but we won't rush back.</div>
  <div id="f03-noreply" class="pill abs" style="right:-40px;bottom:-34px;background:#c13515;color:#fff;font-size:30px;padding:16px 30px;transform-origin:50% 50%">No reply · 6 days</div>
</div>
<div id="f03-revt" class="kt abs" style="left:1210px;top:420px;width:560px;font-size:76px">A review nobody answered.</div>

<div id="f03-hours" class="card abs" style="left:900px;top:170px;width:780px;padding:40px 48px;border-radius:36px">
  <div style="font-weight:600;font-size:30px;margin-bottom:18px">The Juniper · Opening hours</div>
  ${["Monday|12:00–22:00", "Tuesday|12:00–22:00", "Wednesday|12:00–22:00", "Thursday|12:00–22:00", "Friday|12:00–23:00", "Saturday|12:00–23:00", "Sunday|Closed"]
    .map((r) => {
      const [d, h] = r.split("|");
      const sun = d === "Sunday";
      return `<div ${sun ? 'id="f03-sun"' : ""} class="row" style="justify-content:space-between;font-size:30px;padding:12px 18px;border-radius:14px;${sun ? "font-weight:600" : ""}"><span>${d}</span><span ${sun ? 'style="color:#c13515"' : ""}>${h}</span></div>`;
    })
    .join("")}
</div>
<div id="f03-hourst" class="kt abs" style="left:150px;top:400px;width:660px;font-size:76px">Hours that say you're <span style="color:#c13515">closed.</span></div>

<div id="f03-web" class="abs" style="left:310px;top:150px;width:1300px;height:800px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 40px 100px rgba(17,17,17,.16);border:1px solid rgba(17,17,17,.08)">
  <div class="row" style="height:64px;background:#f4f4f2;padding:0 24px;gap:10px"><span style="width:14px;height:14px;border-radius:50%;background:#ff5f57"></span><span style="width:14px;height:14px;border-radius:50%;background:#febc2e"></span><span style="width:14px;height:14px;border-radius:50%;background:#28c840"></span>
    <div style="margin-left:24px;flex:1;height:38px;border-radius:10px;background:#fff;display:flex;align-items:center;padding:0 16px;font-size:20px;color:#5c5c5c">thejuniper.co.uk/book</div></div>
  <div style="padding:70px 90px">
    <div class="kt" style="font-size:84px">Book a table</div>
    <div style="position:relative;display:inline-block;margin-top:30px">
      <div style="font-size:40px;line-height:1.45;color:#2c2c2c;max-width:1050px">Christmas 2025 set menu — £65. Bookings by email. We’ll update this page in the new year.</div>
      <svg class="abs" style="left:0;bottom:-18px" width="1050" height="24" viewBox="0 0 1050 24"><path id="f03-squig" d="M0 12 Q 12.5 0 25 12 T 50 12 T 75 12 T 100 12 T 125 12 T 150 12 T 175 12 T 200 12 T 225 12 T 250 12 T 275 12 T 300 12 T 325 12 T 350 12 T 375 12 T 400 12 T 425 12 T 450 12 T 475 12 T 500 12 T 525 12 T 550 12 T 575 12 T 600 12 T 625 12 T 650 12 T 675 12 T 700 12 T 725 12 T 750 12 T 775 12 T 800 12 T 825 12 T 850 12 T 875 12 T 900 12 T 925 12 T 950 12 T 975 12 T 1000 12 T 1025 12 T 1050 12" fill="none" stroke="#c13515" stroke-width="4" stroke-dasharray="2000" stroke-dashoffset="2000"/></svg>
    </div>
    <div style="margin-top:60px;display:inline-flex;height:76px;padding:0 44px;border-radius:999px;background:#ececea;color:#777;font-size:30px;font-weight:600;align-items:center">Reserve</div>
  </div>
  <div id="f03-cur" class="abs" style="left:900px;top:700px;font-size:44px">➤</div>
</div>
<div id="f03-ink" class="fill" style="background:#111"></div>`,
  `
tl.fromTo('#f03-bl',{x:0},{x:-300,duration:9.8,ease:'none'},0);
wordsIn(split('#f03-q'),0.25,{st:0.1});
tl.fromTo('.f03-res',{opacity:1},{opacity:1,duration:0.01},0);
tl.to(['#f03-r0','#f03-r2'],{opacity:0,filter:'blur(8px)',duration:0.4},1.3);
tl.to('#f03-r1',{scale:1.5,y:-80,duration:0.6,ease:'power3.inOut'},1.3);
tl.to(['#f03-list','#f03-q'],{scale:3,opacity:0,filter:'blur(16px)',duration:0.45,ease:'power2.in'},1.9);
// beat 1 — review
tl.fromTo('#f03-rev',{opacity:0,rotation:-9,scale:0.8,y:120},{opacity:1,rotation:-2,scale:1,y:0,duration:0.6,ease:'back.out(1.4)'},2.2);
wordsIn(split('#f03-revt'),2.4,{st:0.09});
tl.fromTo('#f03-noreply',{opacity:0,scale:2.4,rotation:-14},{opacity:1,scale:1,rotation:-6,duration:0.3,ease:'power4.in'},2.95);
tl.to('#f03-rev',{x:-8,duration:0.05,yoyo:true,repeat:3},3.25);
tl.to(['#f03-rev','#f03-revt'],{x:-2600,opacity:0,filter:'blur(18px)',duration:0.45,ease:'power3.in'},3.75);
// beat 2 — hours
tl.fromTo('#f03-hours',{opacity:0,x:900,filter:'blur(18px)'},{opacity:1,x:0,filter:'blur(0px)',duration:0.5,ease:'power3.out'},3.95);
wordsIn(split('#f03-hourst'),4.1,{st:0.08});
tl.to('#f03-sun',{backgroundColor:'rgba(193,53,21,.12)',duration:0.3},5.0);
tl.to('#f03-hours',{scale:1.18,transformOrigin:'50% 95%',duration:1.0,ease:'power2.inOut'},5.0);
tl.to(['#f03-hours','#f03-hourst'],{y:1100,duration:0.5,ease:'power3.in'},6.4);
// beat 3 — booking page
tl.fromTo('#f03-web',{opacity:1,y:1000,rotationX:24,transformPerspective:1600},{y:0,rotationX:0,duration:0.7,ease:'expo.out'},6.75);
tl.to('#f03-squig',{strokeDashoffset:0,duration:0.7,ease:'power2.inOut'},8.3);
tl.fromTo('#f03-cur',{x:300,y:200},{x:-560,y:-80,duration:0.8,ease:'power2.inOut'},7.6);
tl.to('#f03-web',{scale:1.06,duration:1.4,ease:'none'},8.0);
tl.fromTo('#f03-ink',{clipPath:'inset(100% 0 0 0)'},{clipPath:'inset(0% 0 0 0)',duration:0.45,ease:'expo.inOut'},9.35);
`,
);

/* ───────────── 04 — The cost (17.3–20.2) ───────────── */
const tables = Array.from({ length: 12 }, (_, i) => {
  const x = 330 + (i % 6) * 220, y = 300 + Math.floor(i / 6) * 220;
  return `<div class="tb abs" id="f04-t${i}" style="left:${x}px;top:${y}px;width:150px;height:150px">
    <div class="abs tbtop" style="left:35px;top:35px;width:80px;height:80px;border-radius:18px;background:#a8ff2e;box-shadow:0 0 40px rgba(168,255,46,.45)"></div>
    ${[[63, 0], [63, 126], [0, 63], [126, 63]].map(([l, t]) => `<div class="abs" style="left:${l}px;top:${t}px;width:24px;height:24px;border-radius:50%;background:#3a3a3a"></div>`).join("")}
  </div>`;
}).join("");
frame(
  "04-cost.html",
  "f04-cost",
  2.9,
  `
<div class="fill" style="background:#111"></div>
<div id="f04-grid" class="fill">${tables}</div>
<div id="f04-t" class="kt abs" style="left:0;right:0;top:120px;text-align:center;font-size:84px;color:#fff">That quietly costs you a table.</div>
<div id="f04-lime" class="fill" style="background:#a8ff2e"></div>`,
  `
tl.fromTo('.tb',{opacity:0,scale:0.6},{opacity:1,scale:1,duration:0.4,stagger:{each:0.03,from:'center'},ease:'back.out(1.6)'},0.05);
wordsIn(split('#f04-t'),0.15,{st:0.08});
tl.fromTo('#f04-grid',{y:40},{y:90,duration:2.9,ease:'none'},0);
[3,8,5].forEach(function(n,i){var t=1.0+i*0.45;tl.to('#f04-t'+n+' .tbtop',{backgroundColor:'#2a2a2a',boxShadow:'0 0 0 rgba(0,0,0,0)',duration:0.25},t);tl.to('#f04-t'+n,{scale:0.85,opacity:0.5,duration:0.25},t);});
tl.fromTo('#f04-lime',{clipPath:'circle(0% at 50% 55%)'},{clipPath:'circle(75% at 50% 55%)',duration:0.4,ease:'expo.in'},2.5);
`,
);

/* ───────────── 05 — Meet KOB (20.2–26.5) ───────────── */
frame(
  "05-meet-kob.html",
  "f05-meet",
  6.3,
  `
<div class="fill" style="background:#a8ff2e"></div>
<div id="f05-lock" class="abs" style="left:0;right:0;top:0;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center">
  <div class="row" style="gap:44px">
    <div id="f05-orbw" style="position:relative;width:200px;height:200px">${orb(200, "f05-orb")}<div id="f05-dot" class="abs" style="left:85px;top:85px;width:30px;height:30px;border-radius:50%;background:#111"></div></div>
    <div id="f05-wm" class="wordmark" style="font-size:230px">KOB</div>
  </div>
  <div id="f05-sub" class="kt" style="font-size:54px;margin-top:40px">Your restaurant manager</div>
</div>
<div id="f05-l1" class="kt abs" style="left:0;right:0;top:470px;text-align:center;font-size:118px">It does the work.</div>
<div id="f05-l2" class="kt abs" style="left:0;right:0;top:640px;text-align:center;font-size:118px">You just <span id="f05-ap" style="position:relative;display:inline-block;padding:0 26px"><span id="f05-apbg" class="abs" style="inset:6px 0 -2px 0;background:#111;border-radius:22px"></span><span style="position:relative;color:#a8ff2e">approve.</span></span></div>
<div id="f05-white" class="fill" style="background:#fff"></div>`,
  `
tl.fromTo('#f05-dot',{scale:0},{scale:1,duration:0.25,ease:'back.out(2)'},0.05);
tl.to('#f05-dot',{scale:6,opacity:0,duration:0.35,ease:'power2.in'},0.55);
tl.fromTo('#f05-orb',{scale:0.1,opacity:0},{scale:1,opacity:1,duration:0.6,ease:'back.out(1.7)'},0.6);
tl.fromTo('#f05-wm',{clipPath:'inset(0 100% 0 0)',x:-60},{clipPath:'inset(0 0% 0 0)',x:0,duration:0.55,ease:'expo.out'},0.95);
wordsIn(split('#f05-sub'),1.95,{st:0.08});
tl.to('#f05-lock',{y:-300,scale:0.55,duration:0.7,ease:'expo.inOut'},3.5);
wordsIn(split('#f05-l1'),3.75,{st:0.09,y:70});
tl.fromTo('#f05-l2',{opacity:0,y:80,filter:'blur(10px)'},{opacity:1,y:0,filter:'blur(0px)',duration:0.4,ease:'power3.out'},5.0);
tl.fromTo('#f05-apbg',{scaleX:0,transformOrigin:'0% 50%'},{scaleX:1,duration:0.3,ease:'power3.out'},5.3);
tl.to(['#f05-lock','#f05-l1','#f05-l2'],{scale:1.25,opacity:0,filter:'blur(14px)',duration:0.22,ease:'power2.in'},6.05);
tl.fromTo('#f05-white',{opacity:0},{opacity:1,duration:0.2},6.1);
`,
);

/* ───────────── 06 — Review loop (26.5–35.7) ───────────── */
const reply =
  "Thanks Tom — glad the lamb landed. Saturday got away from us; we've put an extra runner on. Hope you'll come back. — Priya";
frame(
  "06-review-loop.html",
  "f06-review",
  9.2,
  `
${bloom("f06-bl", "left:-560px;top:-700px;width:1600px;height:1300px")}
<div id="f06-notif" class="card abs row" style="left:460px;top:120px;width:1000px;padding:28px 34px;gap:26px;border-radius:36px">
  <div style="width:96px;height:96px;border-radius:24px;background:#a8ff2e;display:flex;align-items:center;justify-content:center">${orb(58)}</div>
  <div style="flex:1"><div style="font-weight:600;font-size:32px">New ★★★★☆ review</div><div style="font-size:27px;margin-top:4px">Tom: “Came for the roast. Lamb was spot on. A bit slow on Saturday.”</div></div>
  <div class="muted abs" style="right:30px;top:22px;font-size:20px">now</div>
</div>
<div id="f06-head" class="kt abs" style="left:0;right:0;top:100px;text-align:center;font-size:88px">Drafted in your voice.</div>
<div id="f06-rev" class="card abs" style="left:150px;top:330px;width:700px;padding:44px;border-radius:34px">
  <div class="muted" style="font-size:22px">Google review · Tom</div>
  <div class="stars" style="font-size:34px;margin-top:8px">★★★★☆</div>
  <div style="font-size:40px;line-height:1.35;margin-top:16px;font-weight:500">Came for the roast. Lamb was spot on. A bit slow on Saturday.</div>
</div>
<div id="f06-draft" class="card abs" style="left:930px;top:330px;width:840px;min-height:470px;padding:44px;border-radius:34px;border:2px solid #2f9e5f">
  <div class="row" style="gap:14px">${orb(40)}<div style="font-size:22px;font-weight:600;letter-spacing:.08em;color:#1f7a48">KOB'S DRAFT · AS PRIYA</div></div>
  <div id="f06-txt" style="font-size:34px;line-height:1.45;margin-top:22px">${reply}</div>
</div>

<div id="f06-phw" class="abs" style="left:734px;top:75px;width:452px;height:930px">
  <div style="width:452px;height:930px;border-radius:76px;background:#16171a;padding:13px;box-shadow:inset 0 0 0 2px #3a3b3f,0 40px 90px rgba(17,17,17,.16)">
    <div style="position:relative;width:100%;height:100%;border-radius:64px;background:#f4f4f2;overflow:hidden">
      <div class="abs" style="top:14px;left:164px;width:124px;height:36px;border-radius:20px;background:#000"></div>
      <div class="abs row" style="top:22px;left:46px;right:46px;justify-content:space-between;font-weight:600;font-size:17px"><span>9:41</span><span>●●● ▮</span></div>
      <div class="abs" style="top:78px;left:16px;right:16px">
        <div class="row" style="gap:12px;padding:6px">${orb(38)}<div><div class="kt" style="font-size:30px">Today</div><div class="muted" style="font-size:13.5px">The Juniper · Mon 19 Oct</div></div></div>
        <div style="background:#fff;border:1px solid rgba(17,17,17,.08);border-radius:24px;padding:18px;margin-top:12px">
          <div style="font-size:17px;font-weight:500">Reply to Tom's ★★★★☆ review</div>
          <div class="muted" style="font-size:13.5px;margin-top:3px">Google review · 2 min ago</div>
          <div style="background:#f4f4f2;border-radius:16px;padding:11px 13px;font-size:14px;margin-top:12px">Came for the roast. Lamb was spot on. A bit slow on Saturday.</div>
          <div style="border-left:3px solid #2f9e5f;padding:2px 0 2px 11px;font-size:14px;line-height:1.45;margin-top:12px">${reply}</div>
          <div class="row" style="gap:8px;font-size:13.5px;margin-top:12px"><span id="f06-sdot" style="width:10px;height:10px;border-radius:50%;background:#d97706"></span><span id="f06-stxt">Ready to post · waiting for your OK</span></div>
          <div style="position:relative"><div id="f06-btn" style="position:relative;height:50px;border-radius:999px;background:#111;color:#fff;font-size:15.5px;font-weight:500;margin-top:12px;overflow:hidden">
            <div class="f06-bl abs" style="inset:0;display:flex;align-items:center;justify-content:center">Approve</div>
            <div class="f06-bl abs" style="inset:0;display:flex;align-items:center;justify-content:center;opacity:0">Posting…</div>
            <div class="f06-bl abs" style="inset:0;display:flex;align-items:center;justify-content:center;opacity:0">Checking Google…</div>
            <div class="f06-bl abs" style="inset:0;display:flex;align-items:center;justify-content:center;opacity:0">Done ✓</div>
          </div><div id="f06-f" class="finger" style="left:calc(50% - 32px);top:-7px;opacity:0"></div><div id="f06-rp" class="ripple" style="left:calc(50% - 32px);top:-7px;opacity:0"></div></div>
          <div class="row" style="gap:8px;margin-top:8px;font-size:13px"><span style="border:1px solid rgba(17,17,17,.12);border-radius:999px;padding:8px 14px">Always do this</span><span style="border:1px solid rgba(17,17,17,.12);border-radius:999px;padding:8px 14px">Skip</span></div>
        </div>
      </div>
      
    </div>
  </div>
</div>
<div id="f06-sl" class="kt abs" style="left:190px;top:470px;font-size:96px;color:#2f9e5f">Posted.</div>
<div id="f06-sr" class="kt abs" style="left:1330px;top:470px;font-size:96px;color:#2f9e5f">Checked.</div>
<div id="f06-live" class="pill abs" style="left:760px;top:940px;width:400px;justify-content:center;background:#111;color:#a8ff2e;font-size:24px;padding:14px 0">Live on Google ✓</div>`,
  `
tl.fromTo('#f06-bl',{x:0,y:0},{x:400,y:200,duration:9.2,ease:'none'},0);
tl.fromTo('#f06-notif',{opacity:0,y:-220},{opacity:1,y:0,duration:0.55,ease:'back.out(1.4)'},0.1);
tl.to('#f06-notif',{x:-310,y:210,scale:0.7,opacity:0,duration:0.55,ease:'power3.inOut'},1.35);
tl.fromTo('#f06-rev',{opacity:0,scale:0.85,y:-40},{opacity:1,scale:1,y:0,duration:0.55,ease:'power3.out'},1.5);
wordsIn(split('#f06-head'),2.3,{st:0.08});
tl.fromTo('#f06-draft',{opacity:0,x:120},{opacity:1,x:0,duration:0.5,ease:'power3.out'},2.3);
typeIn(chars('#f06-txt'),2.35,1.4);
// cut to close-up phone
tl.to(['#f06-rev','#f06-draft','#f06-head'],{y:-260,opacity:0,filter:'blur(12px)',duration:0.4,ease:'power2.in'},4.15);
tl.fromTo('#f06-phw',{opacity:0,scale:2.3,y:1300},{opacity:1,scale:2.3,y:60,duration:0.6,ease:'expo.out'},4.35);
tap('#f06-f','#f06-rp',5.05);
tl.to('#f06-btn',{scale:0.96,duration:0.08},5.05); tl.to('#f06-btn',{scale:1,duration:0.15},5.13);
var bl=$$('.f06-bl');
[[0,1,5.3],[1,2,6.9],[2,3,8.0]].forEach(function(s){tl.to(bl[s[0]],{yPercent:-100,opacity:0,duration:0.25,ease:'power2.in'},s[2]);tl.fromTo(bl[s[1]],{yPercent:100,opacity:0},{yPercent:0,opacity:1,duration:0.3,ease:'power2.out'},s[2]+0.1);});
tl.to('#f06-btn',{backgroundColor:'#2f9e5f',duration:0.3},8.0);
tl.to('#f06-sdot',{backgroundColor:'#2f9e5f',duration:0.2},8.0);
tl.set('#f06-stxt',{textContent:'Ready to post · waiting for your OK'},0);
tl.set('#f06-stxt',{textContent:'Posted · read back from Google just now'},8.05);
tl.to('#f06-phw',{scale:0.85,y:-30,duration:0.8,ease:'expo.inOut'},6.6);
wordsIn([$('#f06-sl')],7.2,{y:30});
wordsIn([$('#f06-sr')],7.95,{y:30});
tl.fromTo('#f06-live',{opacity:0,y:30},{opacity:1,y:0,duration:0.4,ease:'back.out(1.6)'},8.4);
`,
);

/* ───────────── 07 — Sensitive waits (35.7–40.6) ───────────── */
const mini = (i, name, stars, text) =>
  `<div class="tick card abs" style="left:0;top:${i * 190}px;width:560px;padding:24px 28px;border-radius:24px">
     <div class="row" style="justify-content:space-between"><div style="font-weight:600;font-size:22px">${name} <span class="stars" style="font-weight:400">${stars}</span></div><span class="pill" style="background:#e7f6ee;color:#1f7a48;font-size:16px;padding:6px 12px">Reply ready ✓</span></div>
     <div class="muted" style="font-size:20px;margin-top:8px">${text}</div></div>`;
frame(
  "07-sensitive.html",
  "f07-sensitive",
  4.9,
  `
${bloom("f07-bl", "right:-600px;top:-700px;width:1500px;height:1300px")}
<div id="f07-belt" class="abs" style="left:1180px;top:0;width:560px;height:2400px">
  ${mini(0, "James", "★★★★★", "Best carbonara in Soho…")}
  ${mini(1, "Priya", "★★★★★", "Lovely staff, great wine list…")}
  ${mini(2, "Tom", "★★★★☆", "Busy but worth the wait…")}
  ${mini(3, "Aisha", "★★★★★", "Birthday dinner, perfect…")}
  ${mini(4, "Ben", "★★★★☆", "Great roast, small portions…")}
  ${mini(5, "Grace", "★★★★★", "Tiramisu was unreal…")}
  ${mini(6, "Leo", "★★★★★", "Our new local…")}
  ${mini(7, "Maya", "★★★★☆", "Cosy and friendly…")}
</div>
<div id="f07-hot" class="card abs" style="left:1180px;top:540px;width:560px;padding:24px 28px;border-radius:24px">
  <div class="row" style="justify-content:space-between"><div style="font-weight:600;font-size:22px">Dan <span class="stars" style="font-weight:400">★★☆☆☆</span></div><span id="f07-tag0" class="pill" style="background:#e7f6ee;color:#1f7a48;font-size:16px;padding:6px 12px">Reading…</span></div>
  <div class="muted" style="font-size:20px;margin-top:8px">Felt unwell after dinner on Friday…</div>
</div>
<div id="f07-big" class="card abs" style="left:180px;top:270px;width:860px;padding:48px;border-radius:36px;border:2px solid #d97706">
  <div class="row" style="justify-content:space-between"><div style="font-weight:600;font-size:34px">Dan <span class="stars" style="font-weight:400">★★☆☆☆</span></div>
    <span id="f07-needs" class="pill" style="background:#fdecc8;color:#8a4b00;font-size:28px;padding:12px 24px">Needs you</span></div>
  <div style="font-size:38px;line-height:1.4;margin-top:20px">Felt unwell after dinner on Friday. Not sure it was the food, but…</div>
  <div class="row" style="gap:16px;margin-top:34px;font-size:26px;color:#8a4b00;font-weight:500"><span style="font-size:30px">🔒</span>Health mention · KOB won't post without you</div>
</div>
<div id="f07-t" class="kt abs" style="left:180px;top:120px;font-size:92px">Sensitive? It waits for you.</div>`,
  `
tl.fromTo('#f07-belt',{y:420},{y:-900,duration:4.9,ease:'none'},0);
tl.fromTo('#f07-belt',{opacity:0},{opacity:1,duration:0.3},0);
tl.fromTo('#f07-hot',{opacity:0,y:300},{opacity:1,y:0,duration:0.6,ease:'power3.out'},0.2);
tl.to('#f07-belt',{filter:'blur(6px)',opacity:0.35,duration:0.4},1.2);
tl.to('#f07-hot',{opacity:0,scale:1.4,x:-900,y:-180,duration:0.55,ease:'power3.inOut'},1.25);
tl.fromTo('#f07-big',{opacity:0,scale:0.65,x:500,y:120},{opacity:1,scale:1,x:0,y:0,duration:0.55,ease:'power3.inOut'},1.3);
tl.fromTo('#f07-needs',{scale:2,opacity:0},{scale:1,opacity:1,duration:0.3,ease:'power4.in'},2.35);
tl.to('#f07-needs',{scale:1.08,duration:0.35,yoyo:true,repeat:3,ease:'sine.inOut'},2.7);
wordsIn(split('#f07-t'),0.3,{st:0.08});
tl.to(['#f07-big','#f07-t','#f07-belt'],{x:-500,opacity:0,filter:'blur(12px)',duration:0.35,ease:'power2.in'},4.55);
`,
);

/* ───────────── 08 — Fixes (40.6–44.9) ───────────── */
frame(
  "08-fixes.html",
  "f08-fixes",
  4.3,
  `
${bloom("f08-bl", "left:-600px;bottom:-760px;width:1500px;height:1300px")}
<div id="f08-t" class="kt abs" style="left:0;right:0;top:90px;text-align:center;font-size:100px">Spotted. <span style="color:#2f9e5f">Fixed.</span></div>
<div id="f08-a" class="card abs" style="left:170px;top:300px;width:760px;height:560px;border-radius:36px;overflow:hidden">
  <div id="f08-a0" class="fill"><div class="abs" style="left:48px;top:44px;font-size:22px;font-weight:600;letter-spacing:.1em" >GOOGLE · HOURS</div>
  <div class="fill f08-before" style="top:120px;padding:0 48px"><div class="kt" style="font-size:66px">Sunday</div><div class="kt" style="font-size:92px;color:#c13515;margin-top:10px">Closed</div><div class="muted" style="font-size:26px;margin-top:20px">Wrong — you're open</div></div></div>
  <div id="f08-aa" class="fill" style="top:0;background:#e7f6ee;padding:120px 48px 0"><div class="kt" style="font-size:66px">Sunday</div><div class="kt" style="font-size:92px;color:#1f7a48;margin-top:10px">12:00–21:00</div><div style="font-size:26px;margin-top:20px;color:#1f7a48;font-weight:600">Fix approved ✓</div><div class="abs" style="left:48px;top:44px;font-size:22px;font-weight:600;letter-spacing:.1em;color:#1f7a48">GOOGLE · HOURS</div></div>
  <div id="f08-wa" class="abs" style="top:0;bottom:0;left:0;width:10px;background:#a8ff2e;box-shadow:0 0 40px #a8ff2e"></div>
</div>
<div id="f08-b" class="card abs" style="left:990px;top:300px;width:760px;height:560px;border-radius:36px;overflow:hidden">
  <div id="f08-b0" class="fill"><div class="abs" style="left:48px;top:44px;font-size:22px;font-weight:600;letter-spacing:.1em">WEBSITE · BOOKING PAGE</div>
  <div class="fill" style="top:120px;padding:0 48px"><div class="kt" style="font-size:66px">Book a table</div><div style="font-size:38px;line-height:1.4;margin-top:20px;color:#c13515">Christmas 2025 set menu — £65. Bookings by email.</div></div></div>
  <div id="f08-bb" class="fill" style="top:0;background:#e7f6ee;padding:120px 48px 0"><div class="kt" style="font-size:66px">Book a table</div><div style="font-size:38px;line-height:1.4;margin-top:20px">Sunday roast from 12. Tables tonight from 6pm.</div><div style="font-size:26px;margin-top:20px;color:#1f7a48;font-weight:600">Fix ready ✓</div><div class="abs" style="left:48px;top:44px;font-size:22px;font-weight:600;letter-spacing:.1em;color:#1f7a48">WEBSITE · BOOKING PAGE</div></div>
  <div id="f08-wb" class="abs" style="top:0;bottom:0;left:0;width:10px;background:#a8ff2e;box-shadow:0 0 40px #a8ff2e"></div>
</div>`,
  `
tl.fromTo('#f08-a',{opacity:0,y:200,rotation:-4},{opacity:1,y:0,rotation:0,duration:0.55,ease:'expo.out'},0.1);
tl.fromTo('#f08-b',{opacity:0,y:200,rotation:4},{opacity:1,y:0,rotation:0,duration:0.55,ease:'expo.out'},0.25);
var tw=split('#f08-t'); wordsIn([tw[0]],0.3,{}); wordsIn([tw[1]],2.0,{});
tl.fromTo('#f08-aa',{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:0.55,ease:'power3.inOut'},1.3);
tl.fromTo('#f08-wa',{x:0,opacity:1},{x:750,duration:0.55,ease:'power3.inOut'},1.3); tl.to('#f08-wa',{opacity:0,duration:0.15},1.85); tl.set('#f08-a0',{opacity:0},1.86);
tl.fromTo('#f08-bb',{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:0.55,ease:'power3.inOut'},1.9);
tl.fromTo('#f08-wb',{x:0,opacity:1},{x:750,duration:0.55,ease:'power3.inOut'},1.9); tl.to('#f08-wb',{opacity:0,duration:0.15},2.45); tl.set('#f08-b0',{opacity:0},2.46);
tl.to(['#f08-a','#f08-b'],{y:-12,duration:1.2,ease:'sine.inOut'},2.6);
tl.to(['#f08-a','#f08-b','#f08-t'],{yPercent:-120,opacity:0,duration:0.4,ease:'power3.in'},3.9);
`,
);

/* ───────────── 09 — Your week (44.9–48.9) ───────────── */
const stat = (id, label) =>
  `<div style="background:#f4f4f2;border-radius:26px;padding:34px 36px"><div id="${id}" class="kt" style="font-size:128px;line-height:1">0</div><div style="font-size:28px;margin-top:10px;font-weight:500">${label}</div></div>`;
frame(
  "09-your-week.html",
  "f09-week",
  4.0,
  `
<div class="fill" style="background:#f4f4f2"></div>
${bloom("f09-bl", "left:-600px;top:-700px;width:1600px;height:1300px")}
<div id="f09-t" class="kt abs" style="left:0;right:0;top:70px;text-align:center;font-size:84px">Every week, a plain report.</div>
<div id="f09-card" class="card abs" style="left:250px;top:220px;width:1420px;padding:50px 56px;border-radius:40px">
  <div class="row" style="justify-content:space-between"><div class="row" style="gap:18px">${orb(52)}<div class="kt" style="font-size:52px">Your week at The Juniper</div></div><div class="muted" style="font-size:26px">12–18 Oct</div></div>
  <div style="font-size:24px;font-weight:600;letter-spacing:.08em;color:#2f9e5f;margin-top:36px">KOB'S WORK · CHANGES MADE AND CHECKED LIVE</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:18px">
    ${stat("f09-n1", "Reviews replied")}${stat("f09-n2", "Listing fix")}${stat("f09-n3", "Website fixes")}
  </div>
  <div id="f09-v" class="row" style="justify-content:space-between;margin-top:26px;padding:24px 30px;border:1px dashed rgba(17,17,17,.2);border-radius:20px;font-size:24px">
    <span><b style="font-weight:600">Value from KOB (verified)</b> <span class="muted">· only money KOB can prove. Nothing estimated.</span></span><span class="muted">Nothing yet</span></div>
</div>`,
  `
wordsIn(split('#f09-t'),0.1,{st:0.08});
tl.fromTo('#f09-card',{opacity:0,y:260,rotationX:38,transformPerspective:1800,transformOrigin:'50% 100%'},{opacity:1,y:0,rotationX:0,duration:0.8,ease:'expo.out'},0.2);
count($('#f09-n1'),7,1.0,1.1); count($('#f09-n2'),1,1.25,0.6); count($('#f09-n3'),2,1.45,0.7);
tl.fromTo('#f09-v',{opacity:0,y:20},{opacity:1,y:0,duration:0.4},2.1);
tl.to('#f09-card',{scale:1.03,duration:1.5,ease:'none'},2.2);
tl.to(['#f09-card','#f09-t'],{scale:1.2,opacity:0,filter:'blur(14px)',duration:0.3,ease:'power2.in'},3.7);
`,
);

/* ───────────── 10 — Close (48.9–60.0) ───────────── */
frame(
  "10-close.html",
  "f10-close",
  11.1,
  `
<div id="f10-s1" class="fill" style="background:#a8ff2e;display:flex;align-items:center;justify-content:center"><div class="kt" style="font-size:300px;letter-spacing:-.05em">NOTHING</div></div>
<div id="f10-s2" class="fill" style="background:#fff;display:flex;align-items:center;justify-content:center;opacity:0"><div class="kt" style="font-size:300px;letter-spacing:-.05em">GOES LIVE</div></div>
<div id="f10-s3" class="fill" style="background:#111;display:flex;align-items:center;justify-content:center;opacity:0"><div class="kt" style="font-size:300px;letter-spacing:-.05em;color:#a8ff2e">WITHOUT</div></div>
<div id="f10-s4" class="fill" style="background:#a8ff2e;display:flex;align-items:center;justify-content:center;opacity:0"><div class="kt" style="font-size:300px;letter-spacing:-.05em">YOUR OK.</div></div>
<div id="f10-end" class="fill" style="opacity:0">
  ${bloom("f10-bl", "left:160px;top:-110px;width:1600px;height:1300px")}
  <div class="fill" style="display:flex;flex-direction:column;align-items:center;justify-content:center">
    <div class="row" style="gap:40px"><div id="f10-orb">${orb(170)}</div><div id="f10-wm" class="wordmark" style="font-size:200px">KOB</div></div>
    <div id="f10-tag" class="kt" style="font-size:72px;margin-top:50px">Your restaurant, handled.</div>
    <div id="f10-url" class="kt" style="font-size:64px;margin-top:46px;color:#2f9e5f">trykob.com</div>
    <div id="f10-trial" class="pill" style="margin-top:24px;background:#111;color:#fff;font-size:26px;padding:14px 30px;font-weight:500">7-day free trial · no card</div>
  </div>
</div>`,
  `
var S=['#f10-s1','#f10-s2','#f10-s3','#f10-s4'], T=[0,1.0,1.62,2.0];
S.forEach(function(s,i){tl.set(s,{opacity:1},T[i]); tl.fromTo(s+' .kt',{scale:1.35,filter:'blur(8px)'},{scale:1,filter:'blur(0px)',duration:0.3,ease:'expo.out'},T[i]); if(i<3) tl.set(s,{opacity:0},T[i+1]+0.001);});
tl.to('#f10-s4 .kt',{scale:0.92,duration:0.8,ease:'none'},2.3);
tl.set('#f10-s4',{opacity:0},3.05);
tl.set('#f10-end',{opacity:1},3.05);
tl.fromTo('#f10-orb',{scale:0,rotation:-90},{scale:1,rotation:0,duration:0.6,ease:'back.out(1.8)'},3.1);
tl.fromTo('#f10-wm',{clipPath:'inset(0 100% 0 0)',x:-50},{clipPath:'inset(0 0% 0 0)',x:0,duration:0.55,ease:'expo.out'},3.35);
wordsIn(split('#f10-tag'),4.4,{st:0.12});
tl.fromTo('#f10-url',{opacity:0,y:30},{opacity:1,y:0,duration:0.5,ease:'power3.out'},6.1);
tl.fromTo('#f10-trial',{opacity:0,scale:0.8},{opacity:1,scale:1,duration:0.45,ease:'back.out(1.7)'},6.5);
tl.fromTo('#f10-bl',{x:0,scale:1},{x:-120,scale:1.12,duration:8,ease:'none'},3.05);
`,
);

/* ───────────── index ───────────── */
let t = 0;
const hosts = frames
  .map(({ file, id, dur }) => {
    const h = `    <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/frames/${file}" data-start="${t.toFixed(2)}" data-duration="${dur}" data-track-index="1" data-width="1920" data-height="1080"></div>`;
    t += dur;
    return h;
  })
  .join("\n");
const total = Number(t.toFixed(2));
writeFileSync(
  join(ROOT, "index.html"),
  `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #ffffff; }
      #root { width: 100%; height: 100%; position: relative; background: #ffffff; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${hosts}
      <audio id="vo" src="assets/voice/george-take.wav" data-start="0.3" data-duration="56.56" data-track-index="10" data-volume="1"></audio>
      <audio id="bgm" src="assets/bgm/bed-60.wav" data-start="0" data-duration="${total}" data-track-index="11" data-volume="0.16"></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.set({}, {}, ${total});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`,
);
console.log(`frames: ${frames.length}, total ${total}s`);
