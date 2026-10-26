/** Original, quiet generative ambience. No microphone, network, music or third-party recordings. */
export type AmbienceMix = { indoor: number; outdoor: number; fire: number };
export function ambienceMix(
  local: readonly number[],
  desktop = false,
): AmbienceMix {
  const [x, y, z] = local;
  const wall =
    Math.max(0, Math.min(1, (5.9 - Math.abs(x)) / 0.65)) *
    Math.max(0, Math.min(1, (4.8 - Math.abs(z)) / 0.85));
  const indoor = desktop ? 1 : wall,
    fireDistance = Math.hypot(x - 4.9, y - 1.9, z);
  return {
    indoor,
    outdoor: 1 - indoor * 0.88,
    fire: indoor * Math.max(0.12, Math.min(1, 2.3 / (fireDistance + 1))),
  };
}
export function noiseSamples(length: number, seed = 4629, brown = false) {
  const out = new Float32Array(length);
  let n = seed >>> 0,
    previous = 0;
  for (let i = 0; i < length; i++) {
    n = (1664525 * n + 1013904223) >>> 0;
    const white = n / 2147483648 - 1;
    previous = (previous + 0.025 * white) / 1.025;
    out[i] = brown ? Math.tanh(previous * 3) : white * 0.6;
  }
  return out;
}
type AudioSnapshot = {
  enabled: boolean;
  state: string;
  zone: string;
  volume: number;
  rms: number;
  mix: AmbienceMix;
  error: string;
};
export class Ambience {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private wind: GainNode | null = null;
  private water: GainNode | null = null;
  private room: GainNode | null = null;
  private fire: GainNode | null = null;
  private birds: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private desired = false;
  private mix: AmbienceMix = { indoor: 0, outdoor: 1, fire: 0 };
  volume = 0.42;
  error = "";
  private buffer(brown: boolean, seconds = 13) {
    const c = this.context!,
      b = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
    b.copyToChannel(noiseSamples(b.length, brown ? 2411 : 7183, brown), 0);
    return b;
  }
  private bed(
    buffer: AudioBuffer,
    frequency: number,
    type: BiquadFilterType,
    gain: number,
    output: GainNode,
  ) {
    const c = this.context!,
      source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      level = c.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.6;
    level.gain.value = gain;
    source.connect(filter).connect(level).connect(output);
    source.start();
    this.sources.push(source);
    return level;
  }
  private init() {
    const c = (this.context = new AudioContext());
    this.master = c.createGain();
    this.master.gain.value = 0;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -17;
    compressor.ratio.value = 3;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this.master
      .connect(compressor)
      .connect(this.analyser)
      .connect(c.destination);
    const group = () => {
      const n = c.createGain();
      n.gain.value = 0;
      n.connect(this.master!);
      return n;
    };
    this.wind = group();
    this.water = group();
    this.room = group();
    this.fire = group();
    this.birds = group();
    const brown = this.buffer(true),
      white = this.buffer(false);
    const windLevel = this.bed(brown, 620, "lowpass", 0.36, this.wind);
    this.bed(white, 1850, "bandpass", 0.045, this.wind);
    this.bed(brown, 1150, "lowpass", 0.27, this.water);
    this.bed(white, 2650, "bandpass", 0.04, this.water);
    this.bed(brown, 220, "lowpass", 0.12, this.room);
    this.bed(white, 950, "lowpass", 0.025, this.room);
    this.bed(brown, 600, "lowpass", 0.17, this.fire);
    this.bed(white, 3200, "highpass", 0.009, this.fire);
    const lfo = c.createOscillator(),
      depth = c.createGain();
    lfo.frequency.value = 0.085;
    depth.gain.value = 0.07;
    lfo.connect(depth).connect(windLevel.gain);
    lfo.start();
    this.sources.push(lfo);
    this.timer = setInterval(() => this.schedule(), 650);
    this.apply();
  }
  private chirp(time: number, pitch: number) {
    const c = this.context!,
      osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.3, time + 0.07);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.82, time + 0.22);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.009, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    const pan = c.createStereoPanner();
    pan.pan.value = Math.sin(this.tick * 0.82) * 0.7;
    osc.connect(gain).connect(pan).connect(this.birds!);
    osc.start(time);
    osc.stop(time + 0.25);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
  }
  private schedule() {
    const c = this.context;
    if (!c || c.state !== "running" || !this.desired || document.hidden) return;
    this.tick++;
    if (this.tick % 13 === 3) {
      const t = c.currentTime + 0.03,
        p = 2450 + 350 * Math.sin(this.tick);
      this.chirp(t, p);
      this.chirp(t + 0.31, p * 1.14);
    }
    if (this.tick % 3 !== 0) {
      const source = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        g = c.createGain();
      source.buffer = this.buffer(false, 0.055);
      filter.type = "bandpass";
      filter.frequency.value = 1200 + ((this.tick * 367) % 2800);
      filter.Q.value = 0.7;
      g.gain.setValueAtTime(0.001, c.currentTime);
      g.gain.linearRampToValueAtTime(0.045, c.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05);
      source.connect(filter).connect(g).connect(this.fire!);
      source.start();
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        g.disconnect();
      };
    }
  }
  private apply() {
    if (!this.context || !this.master) return;
    const t = this.context.currentTime,
      fade = 0.32;
    this.master.gain.setTargetAtTime(this.desired ? this.volume : 0, t, 0.12);
    this.wind!.gain.setTargetAtTime(this.mix.outdoor, t, fade);
    this.water!.gain.setTargetAtTime(this.mix.outdoor, t, fade);
    this.birds!.gain.setTargetAtTime(this.mix.outdoor, t, fade);
    this.room!.gain.setTargetAtTime(this.mix.indoor, t, fade);
    this.fire!.gain.setTargetAtTime(this.mix.fire, t, fade);
  }
  async enable(value: boolean) {
    this.desired = value;
    this.error = "";
    try {
      if (value && !this.context) this.init();
      if (value) await this.context?.resume();
      this.apply();
    } catch (e) {
      this.desired = false;
      this.error = e instanceof Error ? e.message : String(e);
    }
    return this.desired && this.context?.state === "running";
  }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    this.apply();
  }
  update(local: readonly number[], desktop = false) {
    this.mix = ambienceMix(local, desktop);
    this.apply();
  }
  async visibility(hidden: boolean) {
    if (!this.context) return;
    if (hidden) await this.context.suspend();
    else if (this.desired)
      try {
        await this.context.resume();
      } catch {
        this.error = "请再次点击开启环境音";
      }
  }
  /** Records only this app's generated output, never the microphone/system audio. */
  async recordSample(seconds = 6): Promise<Blob> {
    if (
      !this.context ||
      this.context.state !== "running" ||
      !this.analyser ||
      !this.desired
    )
      throw new Error("请先开启环境音");
    const destination = this.context.createMediaStreamDestination();
    this.analyser.connect(destination);
    return new Promise((resolve, reject) => {
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(destination.stream, {
          mimeType: mime,
        }),
        parts: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) parts.push(event.data);
      };
      const finish = () => {
        this.analyser?.disconnect(destination);
        destination.stream.getTracks().forEach((t) => t.stop());
      };
      recorder.onstop = () => {
        finish();
        resolve(new Blob(parts, { type: recorder.mimeType }));
      };
      recorder.onerror = () => {
        finish();
        reject(new Error("声音样本录制失败"));
      };
      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, seconds * 1000);
    });
  }
  snapshot(): AudioSnapshot {
    let rms = 0;
    if (this.analyser && this.context?.state === "running") {
      const a = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(a);
      rms = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0) / a.length);
    }
    return {
      enabled: this.desired,
      state: this.context?.state ?? "not-started",
      zone:
        this.mix.indoor > 0.6
          ? "室内 · 壁炉与柔和室声"
          : "室外 · 湖水、林风与鸟鸣",
      volume: this.volume,
      rms,
      mix: this.mix,
      error: this.error,
    };
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.sources.forEach((s) => {
      try {
        s.stop();
        s.disconnect();
      } catch {}
    });
    void this.context?.close();
    this.context = null;
  }
}
export const ambience = new Ambience();
