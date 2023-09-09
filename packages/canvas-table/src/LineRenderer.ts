export type LineRendererOptions = {
  initialHorizontalLength?: number,
  initialVerticalLength?: number,
  initialColor?: string
}

export class LineRenderer {
  private hCanvas: HTMLCanvasElement;
  private vCanvas: HTMLCanvasElement;

  private color?: string;

  constructor(options: LineRendererOptions) {
    this.hCanvas = this.createCanvas(options.initialHorizontalLength ?? 0, 1);
    this.vCanvas = this.createCanvas(1, options.initialVerticalLength ?? 0);

    this.color = options.initialColor;
    if (this.color) {
      this.fillCanvas(this.hCanvas, this.color)
      this.fillCanvas(this.vCanvas, this.color);
    }
  }

  public hline(ctx: CanvasRenderingContext2D, x: number, y: number, length: number) {
    if (!this.color) {
      return;
    }

    if (this.hCanvas.width < length) {
      this.hCanvas = this.createCanvas(length, 1);
      this.fillCanvas(this.hCanvas, this.color);
    }

    ctx.drawImage(this.hCanvas, x, y, length, 1, 0, 0, length, 1);
  }

  public vline(ctx: CanvasRenderingContext2D, x: number, y: number, length: number) {
    if (!this.color) {
      return;
    }

    if (this.vCanvas.height < length) {
      this.vCanvas = this.createCanvas(1, length);
      this.fillCanvas(this.vCanvas, this.color);
    }

    ctx.drawImage(this.vCanvas, x, y, 1, length, 0, 0, 1, length);
  }

  public setColor(color: string) {
    this.color = color;
    this.fillCanvas(this.hCanvas, color);
    this.fillCanvas(this.vCanvas, color);
  }

  private createCanvas(width: number, height: number) {
    const canvas = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;
    return canvas;
  }

  private fillCanvas(canvas: HTMLCanvasElement, color: string) {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
