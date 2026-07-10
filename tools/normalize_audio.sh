#!/usr/bin/env bash
# normalize_audio.sh — SIPPY one-shot pipeline (spec §6).
# Converts ElevenLabs raw mp3 output in www/audio/_raw/ into game-ready .ogg in www/audio/:
# mono, loudness ~-14 LUFS, leading/trailing silence trimmed, Vorbis, each <=100 KB.
# Voice lines (vox_*) are pitched up ~+5 semitones for the tiny squeaky SIPPY voice.
#
# The mapping below ties each target <name>.ogg to the (random) raw filename ElevenLabs wrote.
# Re-run after regenerating any sample: ./tools/normalize_audio.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/audio_src"          # raw ElevenLabs mp3 source (kept out of www/ so it never ships)
OUT="$ROOT/www/audio"

# target_name|raw_file|pitch(semitones, 0 = none)|trim(1 = trim silence, 0 = keep full)
# slap is one tight transient with no real silence, so trimming clips its body -> trim=0.
MAP=(
  "slap|sfx_sharp_20260610_205600.mp3|0|0"
  "splat|sfx_wet_c_20260610_205602.mp3|0|1"
  "snore_in|sfx_deep__20260610_205603.mp3|0|1"
  "snore_out|sfx_soft__20260610_205605.mp3|0|1"
  "gasp|sfx_sharp_20260610_210841.mp3|0|1"
  "jingle|sfx_tiny__20260610_205607.mp3|0|1"
  "clutch|sfx_trium_20260610_210843.mp3|0|1"
  "harp|sfx_small_20260610_205610.mp3|0|1"
  "snore_in2|sfx_carto_20260610_210844.mp3|0|1"
  "snore_in3|sfx_long__20260610_210846.mp3|0|1"
  "snore_out2|sfx_carto_20260610_210847.mp3|0|1"
  "snore_out3|sfx_soft__20260610_210850.mp3|0|1"
  "vox_onemoresip|tts_one_m_20260610_205627.mp3|5|1"
  "vox_uhoh|tts_uh_oh_20260610_205629.mp3|5|1"
  "vox_worthit|tts_worth_20260610_205629.mp3|5|1"
)

trim="silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:detection=peak,areverse"
norm="loudnorm=I=-14:TP=-1.5:LRA=11"

for row in "${MAP[@]}"; do
  IFS='|' read -r name src pitch dotrim <<< "$row"
  in="$RAW/$src"
  out="$OUT/$name.ogg"
  if [[ ! -f "$in" ]]; then echo "SKIP $name (missing $src)"; continue; fi
  chain=""
  if [[ "$pitch" != "0" ]]; then
    # +N semitone chipmunk shift: resample up then back to 44.1k
    factor=$(awk "BEGIN{printf \"%.5f\", 2^($pitch/12)}")
    chain="asetrate=44100*${factor},aresample=44100,"
  fi
  if [[ "$dotrim" == "1" ]]; then chain="$chain$trim,"; fi
  af="$chain$norm"
  ffmpeg -y -loglevel error -i "$in" -ac 1 -ar 44100 -af "$af" -c:a libvorbis -q:a 3 "$out"
  kb=$(( ($(wc -c < "$out") + 1023) / 1024 ))
  echo "OK   $name.ogg  ${kb} KB"
done
echo "Done. Outputs in www/audio/"
