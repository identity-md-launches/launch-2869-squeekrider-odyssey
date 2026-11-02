// Short synthesized effects: nothing is downloaded and sound starts only by choice.
export class RideAudio {
  private context?: AudioContext;
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
  play(kind: "jump" | "cheese" | "crash") {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const ctx = this.context,
      at = ctx.currentTime;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = kind === "crash" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(
      kind === "cheese" ? 780 : kind === "jump" ? 240 : 130,
      at,
    );
    osc.frequency.exponentialRampToValueAtTime(
      kind === "cheese" ? 1180 : kind === "jump" ? 480 : 50,
      at + 0.12,
    );
    gain.gain.setValueAtTime(0.045, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.16);
  }
  close() {
    void this.context?.close();
  }
}
