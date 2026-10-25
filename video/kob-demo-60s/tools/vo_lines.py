"""TTS one George clip per picture frame, then lay them on the 60s bed.

Usage: python tools/vo_lines.py
Needs ELEVENLABS_API_KEY. Writes assets/voice/lines/*.wav and assets/voice/george-take.wav.
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parent.parent
voice_id = "JBFqnCBsd6RMkjVDRZzb"
model = "eleven_v3"
req_path = root / "audio_request.json"
spec = json.loads(req_path.read_text(encoding="utf-8"))
lines = spec["lines"]
settings = spec.get("voice_settings") or {"stability": 0.78, "similarity_boost": 0.8}

out_dir = root / "assets" / "voice" / "lines"
out_dir.mkdir(parents=True, exist_ok=True)
key = os.environ.get("ELEVENLABS_API_KEY")
if not key:
    sys.exit("ELEVENLABS_API_KEY missing")

starts = [float(line["start"]) for line in lines]
ends = starts[1:] + [60.0]


def tts(text: str, dest: Path) -> None:
    body = json.dumps(
        {
            "text": text,
            "model_id": model,
            "voice_settings": settings,
        }
    ).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            dest.write_bytes(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"TTS HTTP {e.code}: {e.read()[:400]!r}")


def probe_dur(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        text=True,
    )
    return float(out.strip())


placed: list[Path] = []
with tempfile.TemporaryDirectory() as tmp:
    tmp_path = Path(tmp)
    for i, line in enumerate(lines):
        lid = line["id"]
        mp3 = tmp_path / f"{lid}.mp3"
        wav = out_dir / f"{lid}.wav"
        tts(line["text"], mp3)
        subprocess.check_call(
            ["ffmpeg", "-y", "-i", str(mp3), "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1", str(wav)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        dur = probe_dur(wav)
        budget = ends[i] - starts[i] - 0.12
        if dur > budget:
            sys.exit(f"line {lid} is {dur:.2f}s, budget {budget:.2f}s — cut words, do not speed")
        delay_ms = int(round(starts[i] * 1000))
        delayed = tmp_path / f"{lid}-60.wav"
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(wav),
                "-af",
                f"adelay={delay_ms}|{delay_ms},apad=whole_dur=60,afade=t=in:st=0:d=0.02,afade=t=out:st={59.85}:d=0.15",
                str(delayed),
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        placed.append(delayed)
        print(f"{lid}: {dur:.2f}s at {starts[i]:.1f}s (budget {budget:.2f}s)")

    mix_inputs: list[str] = []
    for p in placed:
        mix_inputs.extend(["-i", str(p)])
    n = len(placed)
    take = root / "assets" / "voice" / "george-take.wav"
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            *mix_inputs,
            "-filter_complex",
            f"amix=inputs={n}:duration=longest:normalize=0,alimiter=limit=0.95",
            "-ar",
            "44100",
            "-ac",
            "1",
            str(take),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"wrote {take} ({probe_dur(take):.2f}s)")
