// audio.js — 100% synthesized audio, ported verbatim from sippy-prototype.html's AudioSys.
// Dynamic voices (buzz, slurp, heartbeat) track gameplay; one-shots are synth blips/noise.
// (The ElevenLabs sample layer from the spec is a later milestone; this is the proven base.)

let _muted = false;

// One-shot sample manifest (spec §6). Files live in www/audio/<name>.ogg. Missing files just
// fall back to the synth versions below, so the game is fully playable with zero audio assets.
const SAMPLE_NAMES = ['slap', 'splat', 'snore_in', 'snore_out', 'gasp', 'jingle', 'clutch', 'harp',
  'snore_in2', 'snore_in3', 'snore_out2', 'snore_out3',
  'vox_onemoresip', 'vox_uhoh', 'vox_worthit'];

export const AudioSys = {
  ctx: null, master: null, buzz: null, slurp: null, samples: {},
  samplesReady: null,   // Promise that resolves once loadSamples() settles (or null pre-init)
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = _muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
    this.samplesReady = this.loadSamples();
  },
  async loadSamples() {
    if (!this.ctx) return;
    await Promise.all(SAMPLE_NAMES.map(async (n) => {
      try {
        const r = await fetch('audio/' + n + '.ogg');
        if (!r.ok) return;
        this.samples[n] = await this.ctx.decodeAudioData(await r.arrayBuffer());
      } catch (e) { /* no file → synth fallback */ }
    }));
  },
  // Play a one-shot sample the moment its buffer is ready. If samples are still decoding (the
  // first press after a cold start), wait for loadSamples() to settle, THEN play — so the
  // brand-hook "one more sip…" isn't silently dropped on the very first night. Best-effort:
  // resolves whether or not the sample existed. Guarded by a max wait so it can't hang.
  async _shotWhenReady(name, vol = 1) {
    if (this.samples[name]) return this._shot(name, vol);
    if (this.samplesReady) {
      try { await Promise.race([this.samplesReady, new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
    }
    return this._shot(name, vol);
  },
  // Play a loaded sample; returns true if it played (so the synth version can be skipped).
  _shot(name, vol = 1) {
    const buf = this.samples[name];
    if (!buf || !this.ctx) return false;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(this.master); src.start();
    return true;
  },
  // Pick a random loaded snore variant from a base name (base, base2, base3, …); '' if none.
  // These are distinct recordings (snort / wheeze / lip-flutter / whistle), not pitch-bends of
  // one sample — so a night of snoring stays varied without sounding artificially detuned.
  _pickVariant(base) {
    const have = [base, base + '2', base + '3'].filter((n) => this.samples[n]);
    return have.length ? have[(Math.random() * have.length) | 0] : '';
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  setMuted(m) { _muted = !!m; if (this.master) this.master.gain.value = _muted ? 0 : 0.55; },

  // --- mosquito buzz: two detuned saws through a wobbling bandpass ---
  startBuzz() {
    if (!this.ctx || this.buzz) return;
    const t = this.now();
    const o1 = this.ctx.createOscillator(), o2 = this.ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.value = 580; o2.frequency.value = 587;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.15);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 22;
    const lg = this.ctx.createGain(); lg.gain.value = 60;
    lfo.connect(lg); lg.connect(o1.frequency);
    o1.connect(bp); o2.connect(bp); bp.connect(g); g.connect(this.master);
    o1.start(); o2.start(); lfo.start();
    this.buzz = { o1, o2, g, lfo };
  },
  setBuzzWeight(f) {
    if (!this.buzz) return;
    const base = lerp(580, 240, f);
    this.buzz.o1.frequency.setTargetAtTime(base, this.now(), 0.1);
    this.buzz.o2.frequency.setTargetAtTime(base + 7, this.now(), 0.1);
    this.buzz.lfo.frequency.setTargetAtTime(lerp(22, 9, f), this.now(), 0.1);
  },
  stopBuzz() {
    if (!this.buzz) return;
    const { o1, o2, g, lfo } = this.buzz, t = this.now();
    g.gain.setTargetAtTime(0, t, 0.08);
    setTimeout(() => { try { o1.stop(); o2.stop(); lfo.stop(); } catch (e) {} }, 300);
    this.buzz = null;
  },

  // --- slurp: rising sine with bubbly vibrato while drinking ---
  startSlurp() {
    if (!this.ctx || this.slurp) return;
    const t = this.now();
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 160;
    const v = this.ctx.createOscillator(); v.frequency.value = 11;
    const vg = this.ctx.createGain(); vg.gain.value = 24;
    v.connect(vg); vg.connect(o.frequency);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.1);
    o.connect(g); g.connect(this.master); o.start(); v.start();
    this.slurp = { o, v, g };
  },
  setSlurp(f) { if (this.slurp) this.slurp.o.frequency.setTargetAtTime(lerp(160, 520, f), this.now(), 0.15); },
  stopSlurp() {
    if (!this.slurp) return;
    const { o, v, g } = this.slurp, t = this.now();
    g.gain.setTargetAtTime(0, t, 0.05);
    setTimeout(() => { try { o.stop(); v.stop(); } catch (e) {} }, 200);
    this.slurp = null;
  },

  // --- one-shots ---
  blip(freq = 440, dur = 0.12, type = 'square', vol = 0.12) {
    if (!this.ctx) return;
    const t = this.now(), o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  },
  snore(inhale) {
    if (!this.ctx) return;
    // Random sample variant (snore_in / _in2 / _in3 …) + the per-shot pitch jitter from _shot,
    // so a night of snoring never repeats the same breath. Falls back to the synth below.
    const pick = this._pickVariant(inhale ? 'snore_in' : 'snore_out');
    if (pick && this._shot(pick)) return;
    const t = this.now(), dur = inhale ? 0.65 : 0.5;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(inhale ? 300 : 200, t);
    f.frequency.linearRampToValueAtTime(inhale ? 520 : 120, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(inhale ? 0.14 : 0.09, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  },
  heartbeat(intensity) {
    if (!this.ctx) return;
    const t = this.now(), o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const v = 0.05 + intensity * 0.14;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.15);
  },
  gasp() {
    if (!this.ctx) return;
    if (this._shot('gasp')) return;
    const t = this.now(), o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.18);
    g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.25);
  },
  slap() {
    if (!this.ctx) return;
    // Play whichever samples exist, independently — the wet splat must not depend on the slap
    // sample loading. If neither is present, fall through to the synth slap.
    const playedSlap = this._shot('slap');
    const playedSplat = this._shot('splat');
    if (playedSlap || playedSplat) return;
    const t = this.now();
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = 0.5;
    src.connect(g); g.connect(this.master); src.start(t);
    const o = this.ctx.createOscillator(), og = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.3);
    og.gain.setValueAtTime(0.4, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t + 0.4);
  },
  jingle(clutch) {
    if (!this.ctx) return;
    if (this._shot(clutch ? 'clutch' : 'jingle')) return;
    const notes = clutch ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
    notes.forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.12), i * 85));
  },
  harp() {
    if (!this.ctx) return;
    if (this._shot('harp')) return;
    [880, 784, 659, 587, 523].forEach((f, i) => setTimeout(() => this.blip(f, 0.4, 'sine', 0.07), i * 150));
  },
};

function lerp(a, b, t) { return a + (b - a) * t; }
