export class CameraShake {
  private intensity = 0;
  private decay = 0.9;
  public offsetX = 0;
  public offsetY = 0;

  public trigger(amount = 6): void {
    this.intensity = Math.max(this.intensity, amount);
  }

  public update(): void {
    if (this.intensity > 0.1) {
      this.offsetX = (Math.random() * 2 - 1) * this.intensity;
      this.offsetY = (Math.random() * 2 - 1) * this.intensity;
      this.intensity *= this.decay;
    } else {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  public apply(ctx: CanvasRenderingContext2D): void {
    if (this.intensity > 0) {
      ctx.translate(this.offsetX, this.offsetY);
    }
  }
}
