// Procedural sound — no audio files, everything synthesized with WebAudio.
export class SFX {
  constructor() {
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.4;
      this.master.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  blip(freq, t0, dur, type = 'triangle', peak = 0.3, slideTo = null) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noiseHit(t0, dur, freq, q, peak) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.25), t0 + dur);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  flap() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.noiseHit(t, 0.13, 700, 1.2, 0.35); // wing whoosh
    this.blip(240, t, 0.1, 'sine', 0.12, 180);
  }

  score(n) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    // little pentatonic climb that rises with your streak
    const base = 660 * Math.pow(2, (n % 5) * 2 / 12);
    this.blip(base, t, 0.12, 'triangle', 0.25);
    this.blip(base * 1.5, t + 0.08, 0.18, 'triangle', 0.22);
  }

  crash() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.noiseHit(t, 0.4, 900, 0.8, 0.55);
    this.blip(220, t, 0.45, 'sawtooth', 0.3, 45);
  }

  start() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    [523, 659, 784].forEach((f, i) => this.blip(f, t + i * 0.07, 0.14, 'triangle', 0.18));
  }
}
