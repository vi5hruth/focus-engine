/**
 * Procedural audio, generated entirely with the native Web Audio API.
 * No <audio> tags, no MP3/WAV assets — every waveform is synthesized at
 * runtime, so the module has zero binary dependencies.
 */

export type AmbientTrack = "none" | "pink" | "brown" | "drone";

const NOISE_BUFFER_SECONDS = 4;
const NOISE_GAIN = 0.06;
const DRONE_GAIN = 0.05;

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientNode: AudioBufferSourceNode | OscillatorNode[] | null = null;
  private ambientGain: GainNode | null = null;
  private currentTrack: AmbientTrack = "none";
  private stopTimeoutId: number | null = null;

  // Cache buffers to prevent CPU churn and GC pauses on track toggle
  private bufferCache: Map<string, AudioBuffer> = new Map();

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Pre-warms the AudioContext on an explicit user interaction (e.g., clicking start),
   * ensuring background chimes don't get blocked by browser autoplay policies.
   */
  public warmup() {
    this.ensureContext();
  }

  /** Generates or retrieves a cached looping AudioBuffer of pink or brown noise. */
  private getNoiseBuffer(kind: "pink" | "brown"): AudioBuffer {
    const ctx = this.ensureContext();
    const cacheKey = `${kind}-${ctx.sampleRate}`;
    const cached = this.bufferCache.get(cacheKey);
    if (cached) return cached;

    const length = ctx.sampleRate * NOISE_BUFFER_SECONDS;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (kind === "pink") {
      // Paul Kellett's refined pink noise filter (~3dB/octave falloff)
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        data[i] = pink * 0.11;
      }
    } else {
      // Brown noise: integrated random-walk
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
    }

    this.bufferCache.set(cacheKey, buffer);
    return buffer;
  }

  private stopAmbientInternal() {
    if (this.ambientNode) {
      if (Array.isArray(this.ambientNode)) {
        this.ambientNode.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {
            /* already stopped */
          }
        });
      } else {
        try {
          this.ambientNode.stop();
          this.ambientNode.disconnect();
        } catch {
          /* already stopped */
        }
      }
      this.ambientNode = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }
  }

  setAmbient(track: AmbientTrack) {
    const ctx = this.ensureContext();

    // Cancel any pending stop timeouts to avoid race conditions on quick toggles
    if (this.stopTimeoutId !== null) {
      window.clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    this.stopAmbientInternal();
    this.currentTrack = track;
    if (track === "none") return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.connect(this.masterGain!);
    this.ambientGain = gain;

    // Smooth linear ramp without click
    gain.gain.linearRampToValueAtTime(
      track === "drone" ? DRONE_GAIN : NOISE_GAIN,
      ctx.currentTime + 0.6
    );

    if (track === "pink" || track === "brown") {
      const source = ctx.createBufferSource();
      source.buffer = this.getNoiseBuffer(track);
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = track === "pink" ? 3200 : 900;
      source.connect(filter);
      filter.connect(gain);
      source.start();
      this.ambientNode = source;
    } else if (track === "drone") {
      const rootFreq = 110; // A2
      const detunes = [0, 5, -7, 12];
      const oscillators = detunes.map((detune, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = rootFreq * (idx === 3 ? 1.5 : 1);
        osc.detune.value = detune;

        const oscGain = ctx.createGain();
        oscGain.gain.value = idx === 0 ? 1 : 0.4;
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start();
        return osc;
      });
      this.ambientNode = oscillators;
    }
  }

  stopAmbient() {
    if (!this.ambientGain || !this.ctx) {
      this.stopAmbientInternal();
      this.currentTrack = "none";
      return;
    }

    const ctx = this.ctx;
    const gain = this.ambientGain;

    // Anchor current value before ramping to zero to prevent audible clicks
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

    if (this.stopTimeoutId !== null) {
      window.clearTimeout(this.stopTimeoutId);
    }

    this.stopTimeoutId = window.setTimeout(() => {
      this.stopAmbientInternal();
      this.stopTimeoutId = null;
    }, 450);

    this.currentTrack = "none";
  }

  getCurrentTrack(): AmbientTrack {
    return this.currentTrack;
  }

  /** Soft synthetic chime played on session/interval completion. */
  playCompletionChime() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — bright major triad

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 1.2);
    });
  }

  /** Short, low-key tick for split/lap confirmation. */
  playTick() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 880;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.09);
  }
}

// Singleton — a single AudioContext reused across the app lifecycle
export const audioEngine = new ProceduralAudioEngine();