import { SEATS, DT, clamp, type Snapshot } from '../shared/protocol';
import { rapidStrength, sampleWater } from '../shared/world';

/** Continuous layers follow actual immersion/current, rather than GPS speed.
 * A boat drifting with the river should not sound like a powered speedboat. */
export function waterMix(snapshot: Snapshot) {
  const playing = snapshot.stage === 'playing';
  const active = !snapshot.paused && !snapshot.complete && snapshot.condition === 'afloat';
  const flow = sampleWater(snapshot.position.x, snapshot.position.z, snapshot.tick * DT).velocity;
  const relative = Math.hypot(snapshot.velocity.x - flow.x, snapshot.velocity.z - flow.z);
  return {
    river: active ? playing ? .055 : .035 : 0,
    hull: active && playing ? .14 * clamp(relative / 3, 0, 1) : 0,
    rapids: active && playing ? .16 * clamp(rapidStrength(snapshot.position.z) / 1.7, 0, 1) : 0,
    braces: SEATS.map((_, seat) => {
      const blade = snapshot.blades[seat];
      return active && playing && blade?.state === 'BRACE'
        ? .12 * clamp(blade.immersion, 0, 1) * Math.sqrt(clamp(blade.force / 420, 0, 1)) : 0;
    }),
  };
}

export type SoundCue = { kind: 'stroke'; seat: number; effort: number } | { kind: 'break' } | {kind:'checkpoint'} | {kind:'finish'} | {kind:'recovery'} | {kind:'countdown';beat:number};
export function soundCues(previous: Snapshot | undefined, next: Snapshot): SoundCue[] {
  // Joining/reconnecting never replays an old crash or accumulated rowing sounds.
  if (!previous || next.tick < previous.tick || next.paused) return [];
  const cues: SoundCue[] = [];
  if (next.stage === 'lobby') {
    const beat = next.countdownSeconds ?? 0;
    if (previous.stage === 'lobby' && beat > 0 && beat <= 3 && previous.countdownSeconds !== beat) cues.push({kind:'countdown',beat});
    return cues;
  }
  if (next.stage !== 'playing') return [];
  if (next.crashId > previous.crashId && next.condition === 'breaking') cues.push({ kind: 'break' });
  if (next.checkpoint > previous.checkpoint) cues.push({ kind: 'checkpoint' });
  if (next.complete && !previous.complete) cues.push({ kind: 'finish' });
  // F-D: recovery sound when the boat is auto-righted or unstuck.
  if ((next.recoveryId ?? 0) > (previous.recoveryId ?? 0)) cues.push({ kind: 'recovery' });
  if (next.resetId === previous.resetId && next.condition === 'afloat') for (let seat = 0; seat < 4; seat++) {
    if ((next.strokes[seat] ?? 0) > (previous.strokes[seat] ?? 0)) cues.push({ kind: 'stroke', seat, effort: clamp((next.blades[seat]?.force ?? 80) / 280, .2, 1) });
  }
  return cues;
}

/** Fixed procedural ambience graph and bounded, explicitly released event
 * voices. No downloads, microphone or external audio service. */
export class GameAudio {
  private context?: BaseAudioContext;
  private master?: GainNode;
  private ambience: GainNode[] = [];
  private voices = new Set<AudioScheduledSourceNode>();
  private noise?: AudioBuffer;
  private previous?: Snapshot;
  private audible = true;
  enabled = true;
  volume = .55;
  cueCount = 0;
  constructor(context?: BaseAudioContext) { if (context) this.initialize(context); }

  private initialize(context: BaseAudioContext) {
    this.context = context;
    const master = this.master = context.createGain(); master.gain.value = this.enabled && this.audible ? this.volume : 0;
    const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -12; compressor.ratio.value = 8;
    compressor.attack.value = .001; compressor.release.value = .18;
    // A compressor can overshoot during correlated transients. Keep ordinary
    // signals linear and soften only the top of the output before the speakers.
    const guard = context.createWaveShaper(), curve = new Float32Array(4097);
    for (let i = 0; i < curve.length; i++) {
      const x = i * 2 / (curve.length - 1) - 1, magnitude = Math.abs(x);
      curve[i] = Math.sign(x) * (magnitude <= .8 ? magnitude : .8 + .18 * Math.tanh((magnitude - .8) / .18));
    }
    guard.curve = curve;
    master.connect(compressor).connect(guard).connect(context.destination);
    const buffer = this.noise = context.createBuffer(2, context.sampleRate * 2, context.sampleRate);
    let seed = 9147;
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel); let brown = 0;
      for (let i = 0; i < samples.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; brown = (brown + ((seed / 4294967296) * 2 - 1) * .11) / 1.025; samples[i] = brown * 1.7; }
      // A short seam crossfade removes the click at the two-second wrap.
      const seam = Math.floor(context.sampleRate * .04);
      for (let i = 0; i < seam; i++) {
        const blend = i / (seam - 1), tail = samples.length - seam + i;
        samples[tail] = samples[tail]! * (1 - blend) + samples[i]! * blend;
      }
    }
    const layers: {type:BiquadFilterType; frequency:number; pan:number}[] = [
      {type:'lowpass',frequency:950,pan:0},
      {type:'bandpass',frequency:500,pan:0},
      {type:'highpass',frequency:950,pan:0},
      ...SEATS.map(seat => ({type:'bandpass' as const,frequency:1800,pan:seat.side * .75})),
    ];
    this.ambience = layers.map((layer, index) => {
      const source = context.createBufferSource(); source.buffer = buffer; source.loop = true; source.loopStart = .04;
      const filter = context.createBiquadFilter(); filter.type = layer.type; filter.frequency.value = layer.frequency; filter.Q.value = .65;
      const gain = context.createGain(); gain.gain.value = 0;
      const pan = context.createStereoPanner(); pan.pan.value = layer.pan;
      source.connect(filter).connect(gain).connect(pan).connect(master); source.start(0, .04 + index * .23);
      return gain;
    });
  }
  async unlock() {
    if (!this.context) this.initialize(new AudioContext({ latencyHint: 'interactive' }));
    if (this.context instanceof AudioContext && this.context.state === 'suspended') await this.context.resume();
  }
  private applyVolume() {
    if (!this.context || !this.master) return;
    const gain = this.master.gain, now = this.context.currentTime;
    gain.cancelScheduledValues(now); const target=this.enabled && this.audible ? this.volume : 0;
    if(now===0)gain.setValueAtTime(target,now);else gain.setTargetAtTime(target, now, .025);
  }
  setEnabled(enabled: boolean) { this.enabled = enabled; this.applyVolume(); }
  setVolume(volume: number) { this.volume = clamp(volume, 0, 1); this.applyVolume(); }
  setAudible(audible: boolean) { if (audible !== this.audible) { this.audible = audible; this.applyVolume(); } }
  clear() { this.previous = undefined; this.setAudible(false); }
  update(snapshot: Snapshot) {
    const cues = soundCues(this.previous, snapshot); this.previous = snapshot;
    if (!this.context) return;
    const mix = waterMix(snapshot), levels = [mix.river, mix.hull, mix.rapids, ...mix.braces];
    this.ambience.forEach((gain, index) => gain.gain.setTargetAtTime(levels[index]!, this.context!.currentTime, .12));
    if (this.enabled && this.audible) for (const cue of cues) this.play(cue);
  }
  play(cue: SoundCue, delay = 0) {
    const context = this.context, master = this.master;
    if (!context || !master || !this.noise || this.voices.size >= 24) return;
    this.cueCount++;
    const at = context.currentTime + delay;
    if (cue.kind === 'stroke' || cue.kind === 'break') {
      const breaking = cue.kind === 'break', duration = breaking ? .8 : .3;
      const source = context.createBufferSource(); source.buffer = this.noise;
      source.playbackRate.value = breaking ? .6 : 1.5;
      const filter = context.createBiquadFilter(); filter.type = 'bandpass';
      filter.frequency.setValueAtTime(breaking ? 900 : 1900, at); filter.frequency.exponentialRampToValueAtTime(breaking ? 180 : 500, at + duration);
      filter.Q.value = .7;
      const gain = context.createGain(); gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(cue.kind === 'break' ? .9 : .2 + cue.effort * .22, at + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      const pan = context.createStereoPanner(); pan.pan.value = cue.kind === 'stroke' ? SEATS[cue.seat]!.side * .6 : 0;
      source.connect(filter).connect(gain).connect(pan).connect(master);
      this.releaseVoice(source, [filter, gain, pan]); source.start(at, .13); source.stop(at + duration);
      if (breaking) {
        for (let i = 0; i < 3; i++) this.tone(135 - i * 22, at + i * .045, .26, .16, 'triangle');
      } else this.tone(85 + (cue.kind === 'stroke' ? cue.seat : 0) * 8, at, .15, .035, 'sine');
    } else if (cue.kind === 'recovery') {
      // F-D: gentle rising pair of tones signals auto-recovery (capsized/grounded).
      this.tone(330, at, .28, .06, 'sine'); this.tone(440, at + .14, .22, .05, 'sine');
    } else if (cue.kind === 'countdown') {
      // F-E: short blip each second; higher/louder on beat 1 (launch).
      const freq = cue.beat === 1 ? 880 : 660;
      this.tone(freq, at, .12, cue.beat === 1 ? .11 : .07, 'sine');
    } else {
      const notes = cue.kind === 'finish' ? [392, 494, 587, 784] : [523, 659, 784];
      notes.forEach((note, i) => this.tone(note, at + i * .11, .38, .075, 'sine'));
    }
  }
  private tone(frequency: number, at: number, duration: number, level: number, type: OscillatorType) {
    if (this.voices.size >= 24) return;
    const context = this.context!, source = context.createOscillator(), gain = context.createGain();
    source.type = type; source.frequency.setValueAtTime(frequency, at);
    source.frequency.exponentialRampToValueAtTime(frequency * .92, at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(gain).connect(this.master!);
    this.releaseVoice(source, [gain]); source.start(at); source.stop(at + duration);
  }
  private releaseVoice(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    this.voices.add(source);
    source.onended = () => { source.disconnect(); nodes.forEach(node => node.disconnect()); this.voices.delete(source); };
  }
  get resources() { return {ambientLayers:this.ambience.length,activeVoices:this.voices.size}; }
  get state() { return this.context?.state ?? 'locked'; }
}
