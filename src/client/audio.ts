import { SEATS, clamp, type Snapshot } from '../shared/protocol';
import { sampleWater } from '../shared/world';

export type SoundCue = { kind: 'stroke'; seat: number; effort: number } | { kind: 'break' } | {kind:'checkpoint'} | {kind:'finish'};
export function soundCues(previous: Snapshot | undefined, next: Snapshot): SoundCue[] {
  // Joining/reconnecting never replays an old crash or accumulated rowing sounds.
  if (!previous || next.tick < previous.tick || next.stage !== 'playing' || next.paused) return [];
  const cues: SoundCue[] = [];
  if (next.crashId > previous.crashId && next.condition === 'breaking') cues.push({ kind: 'break' });
  if (next.checkpoint > previous.checkpoint) cues.push({ kind: 'checkpoint' });
  if (next.complete && !previous.complete) cues.push({ kind: 'finish' });
  if (next.resetId === previous.resetId && next.condition === 'afloat') for (let seat = 0; seat < 4; seat++) {
    if ((next.strokes[seat] ?? 0) > (previous.strokes[seat] ?? 0)) cues.push({ kind: 'stroke', seat, effort: clamp((next.blades[seat]?.force ?? 80) / 280, .2, 1) });
  }
  return cues;
}

/** Small procedural sound palette. Sources stop after their envelopes; one
 * ambience loop is reused. No downloads, microphone or external audio service. */
export class GameAudio {
  private context?: BaseAudioContext;
  private master?: GainNode;
  private water?: GainNode;
  private noise?: AudioBuffer;
  private previous?: Snapshot;
  private audible = true;
  enabled = true;
  volume = .55;
  cueCount = 0;
  constructor(context?: BaseAudioContext) { if (context) this.initialize(context); }

  private initialize(context: BaseAudioContext) {
    this.context = context;
    const master = this.master = context.createGain(); master.gain.value = this.enabled ? this.volume : 0;
    const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -12; compressor.ratio.value = 4;
    master.connect(compressor).connect(context.destination);
    const buffer = this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = buffer.getChannelData(0); let seed = 9147, brown = 0;
    for (let i = 0; i < samples.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; brown = (brown + ((seed / 4294967296) * 2 - 1) * .11) / 1.025; samples[i] = brown * 1.7; }
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1600;
    this.water = context.createGain(); this.water.gain.value = 0;
    source.connect(filter).connect(this.water).connect(master); source.start();
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
    if (!this.context || !this.water) return;
    const speed = Math.hypot(snapshot.velocity.x, snapshot.velocity.z);
    const zone = sampleWater(snapshot.position.x, snapshot.position.z, snapshot.tick / 60).zone;
    const level = snapshot.stage === 'playing' && !snapshot.paused && snapshot.condition === 'afloat'
      ? .06 + Math.min(.1, speed * .035) + (zone === 'rapids' ? .12 : zone === 'whirlpool' ? .06 : 0) : 0;
    this.water.gain.setTargetAtTime(level, this.context.currentTime, .12);
    if (this.enabled && this.audible) for (const cue of cues) this.play(cue);
  }
  play(cue: SoundCue, delay = 0) {
    const context = this.context, master = this.master;
    if (!context || !master || !this.noise) return;
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
      source.connect(filter).connect(gain).connect(pan).connect(master); source.start(at, .13); source.stop(at + duration);
      if (breaking) {
        for (let i = 0; i < 3; i++) this.tone(135 - i * 22, at + i * .045, .26, .16, 'triangle');
      } else this.tone(85 + (cue.kind === 'stroke' ? cue.seat : 0) * 8, at, .15, .035, 'sine');
    } else {
      const notes = cue.kind === 'finish' ? [392, 494, 587, 784] : [523, 659, 784];
      notes.forEach((note, i) => this.tone(note, at + i * .11, .38, .075, 'sine'));
    }
  }
  private tone(frequency: number, at: number, duration: number, level: number, type: OscillatorType) {
    const context = this.context!, source = context.createOscillator(), gain = context.createGain();
    source.type = type; source.frequency.setValueAtTime(frequency, at);
    source.frequency.exponentialRampToValueAtTime(frequency * .92, at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(gain).connect(this.master!); source.start(at); source.stop(at + duration);
  }
  get state() { return this.context?.state ?? 'locked'; }
}
