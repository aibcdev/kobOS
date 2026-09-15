/** Best female English voices installed on this Mac, UK first. */
const PREFERRED = [
  "Flo (English (UK))",
  "Shelley (English (UK))",
  "Sandy (English (UK))",
  "Flo",
  "Shelley",
  "Sandy",
  "Samantha",
  "Karen",
  "Moira",
  "Tessa",
  "Kathy",
];

function score(voice: SpeechSynthesisVoice) {
  const exact = PREFERRED.indexOf(voice.name);
  if (exact >= 0) return exact;
  const lower = voice.name.toLowerCase();
  const fuzzy = PREFERRED.findIndex((name) =>
    lower.includes(name.split(" ")[0].toLowerCase()),
  );
  if (fuzzy >= 0 && voice.lang.startsWith("en")) return 20 + fuzzy;
  if (voice.lang === "en-GB") return 40;
  if (voice.lang.startsWith("en")) return 50;
  return 99;
}

export function pickKobVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (!english.length) return voices[0] ?? null;
  return [...english].sort((a, b) => score(a) - score(b))[0] ?? null;
}

export function speakAsKob(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const run = () => {
    const voice = pickKobVoice(window.speechSynthesis.getVoices());
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || "en-GB";
    utter.rate = 0.98;
    utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    run();
    return;
  }
  window.speechSynthesis.addEventListener("voiceschanged", run, { once: true });
}
