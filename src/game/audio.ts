export class DozerAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private trackNoiseGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private initialized = false;

  public unlock() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.42;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Shared white noise buffer for crunch/collapse/steam/tracks
      const bufferLen = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferLen; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = noiseBuf;

      // Diesel V6 Komatsu D355A Engine Synth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      filter.Q.value = 2.4;

      const engGain = ctx.createGain();
      engGain.gain.value = 0.0;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 38;

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 57;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(engGain);
      engGain.connect(master);

      osc1.start();
      osc2.start();

      this.engineOsc1 = osc1;
      this.engineOsc2 = osc2;
      this.engineFilter = filter;
      this.engineGain = engGain;

      // Continuous crawler track steel rumble
      const trackSrc = ctx.createBufferSource();
      trackSrc.buffer = noiseBuf;
      trackSrc.loop = true;

      const trackFilter = ctx.createBiquadFilter();
      trackFilter.type = 'bandpass';
      trackFilter.frequency.value = 165;
      trackFilter.Q.value = 1.6;

      const trackGain = ctx.createGain();
      trackGain.gain.value = 0;

      trackSrc.connect(trackFilter);
      trackFilter.connect(trackGain);
      trackGain.connect(master);
      trackSrc.start();

      this.trackNoiseGain = trackGain;
      this.initialized = true;
    } catch {
      // Ignore Web Audio errors on restricted devices
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngine(speedNorm: number, turning: boolean, ramming: boolean, active: boolean) {
    if (!this.initialized || !this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain || !this.trackNoiseGain) {
      return;
    }

    const now = this.ctx.currentTime;
    if (!active) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.15);
      this.trackNoiseGain.gain.setTargetAtTime(0, now, 0.12);
      return;
    }

    const load = Math.min(1, speedNorm + (turning ? 0.25 : 0) + (ramming ? 0.55 : 0));
    const baseFreq = 34 + load * 42 + (ramming ? 12 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(140 + load * 340, now, 0.09);
    this.engineGain.gain.setTargetAtTime(0.14 + load * 0.14, now, 0.08);

    const trackLevel = Math.min(0.18, (speedNorm * 0.14) + (turning ? 0.06 : 0));
    this.trackNoiseGain.gain.setTargetAtTime(trackLevel, now, 0.08);
  }

  public playImpact(intensity = 0.6) {
    if (!this.initialized || !this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0.2, Math.min(1.2, intensity));

    // Noise crunch
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280 + Math.random() * 260, now);
    filter.Q.value = 0.9;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32 * clamped, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28 + clamped * 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(now, Math.random() * 0.8, 0.5);

    // Sub thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.18);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.35 * clamped, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playCollapse(explosive = false) {
    if (!this.initialized || !this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    // Deep structural rumble
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(explosive ? 950 : 520, now);
    filter.frequency.exponentialRampToValueAtTime(95, now + 1.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(explosive ? 0.72 : 0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, 0, 1.3);

    // Heavy bass shockwave
    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(explosive ? 110 : 76, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 0.65);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.72);
  }

  public playSteamHiss() {
    if (!this.initialized || !this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1400;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, 0.2, 0.9);
  }

  public playHorn() {
    this.unlock();
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    [155, 196].forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 680;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.setValueAtTime(0.18, now + 0.36);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.55);
    });
  }

  public dispose() {
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.initialized = false;
  }
}
