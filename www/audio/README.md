# SIPPY audio samples (spec §6)

Drop ElevenLabs one-shots here as `.ogg` (mono, ~-14 LUFS, trimmed, each ≤100 KB).
`audio.js` auto-loads any that exist and falls back to the WebAudio synth for any that don't,
so the game is fully playable with this folder empty.

Generate via the ElevenLabs MCP, then normalize with `tools/normalize_audio.sh`
(ffmpeg mp3 → ogg). Manifest:

| File | Type | Prompt |
|---|---|---|
| slap.ogg | SFX | sharp cartoon open-palm slap on skin, punchy, comedic, very short |
| splat.ogg | SFX | wet cartoon squish splat, small bug, comedic, short |
| snore_in.ogg | SFX | deep rumbling cartoon snore inhale, large sleeping man, 0.7s |
| snore_in2.ogg | SFX | snore inhale variant — sudden pig-like snort |
| snore_in3.ogg | SFX | snore inhale variant — long deep wheeze |
| snore_out.ogg | SFX | soft whistling snore exhale, comedic, 0.5s |
| snore_out2.ogg | SFX | snore exhale variant — sputtering lip flutter |
| snore_out3.ogg | SFX | snore exhale variant — soft high whistle |
| gasp.ogg | SFX | sharp surprised waking gasp, large man, comedic, short |
| jingle.ogg | SFX | tiny cheerful victory jingle, toy xylophone, 3 ascending notes, 1s |
| clutch.ogg | SFX | triumphant tiny fanfare, kazoo and xylophone, comedic, 1.5s |
| harp.ogg | SFX | small angelic harp glissando descending, comedic heaven, 2s |
| vox_onemoresip.ogg | TTS | tiny squeaky voice: "one more sip…" |
| vox_uhoh.ogg | TTS | tiny squeaky voice: "uh oh." |
| vox_worthit.ogg | TTS | tiny squeaky voice: "worth it." |

**Status:** generated (2026-06-10) via the ElevenLabs MCP. 15 one-shots present as mono Vorbis
`.ogg`, ~-14 LUFS, trimmed, each well under 100 KB. The three `vox_*` lines are pitched up +5
semitones for the squeaky SIPPY voice. `snore_in`/`snore_out` have two extra variants each
(`*2`,`*3`) — distinct recordings (snort / wheeze / lip-flutter / whistle), and `audio.js` plays
one at random per breath. (No per-play pitch jitter — detuning a single snore sounded bad.)

Raw ElevenLabs mp3 output is kept in the repo-root `audio_src/` folder (outside `www/` so it
never ships in the APK) purely as source for re-normalizing — `tools/normalize_audio.sh` maps
each `<name>.ogg` to its raw file. The game fetches just the `.ogg` files in this folder.
