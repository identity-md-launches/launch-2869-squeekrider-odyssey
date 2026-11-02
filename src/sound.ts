import type { SoundEvent } from "./game";
// All effects are synthesized locally and unlocked only by an explicit sound action.
export class RideAudio {
  private context?: AudioContext;
  private lastShot = 0;
  enabled = false;
  async enable() {
    try {
      this.context ??= new AudioContext();
      await this.context.resume();
      this.enabled = true;
      this.play("cheese");
      return true;
    } catch {
      this.enabled = false;
      return false;
    }
  }
  play(kind: SoundEvent) {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const ctx = this.context,
      at = ctx.currentTime;
    if (kind === "shoot" && at - this.lastShot < 0.15) return;
    if (kind === "shoot") this.lastShot = at;
    const notes: Record<SoundEvent, [number, number, number, OscillatorType]> =
      {
        jump: [210, 620, 0.15, "sine"],
        shoot: [650, 190, 0.065, "triangle"],
        cheese: [880, 1320, 0.1, "sine"],
        upgrade: [440, 1760, 0.4, "triangle"],
        explosion: [130, 28, 0.28, "sawtooth"],
        crash: [100, 36, 0.2, "triangle"],
        lightning: [1700, 80, 0.32, "sawtooth"],
      };
    const [from, to, duration, wave] = notes[kind];
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + duration);
    gain.gain.setValueAtTime(kind === "shoot" ? 0.018 : 0.04, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  close() {
    void this.context?.close();
  }
}
