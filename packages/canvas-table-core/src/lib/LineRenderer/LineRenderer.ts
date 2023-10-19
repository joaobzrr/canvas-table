import { Size } from "../../types";

export type LineRendererOptions = {
  initialHorizontalLength?: number,
  initialVerticalLength?: number,
  initialColor?: string
}

export class LineRenderer {
  private hCanvas: HTMLCanvasElement;
  private hCtx: CanvasRenderingContext2D;

  private vCanvas: HTMLCanvasElement;
  private vCtx: CanvasRenderingContext2D;

  private color: string;

  constructor(options?: LineRendererOptions) {
    this.hCanvas = document.createElement("canvas");
    this.resizeCanvas(this.hCanvas, {
      width: options?.initialHorizontalLength ?? 1,
      height: 1 
    });
    this.hCtx = this.hCanvas.getContext("2d")!;

    this.vCanvas = document.createElement("canvas");
    this.resizeCanvas(this.vCanvas, {
      width: 1,
      height: options?.initialVerticalLength ?? 1
    })
    this.vCtx = this.vCanvas.getContext("2d")!;

    this.color = options?.initialColor ?? "black";
    this.fillCanvas(this.hCanvas, this.hCtx)
    this.fillCanvas(this.vCanvas, this.vCtx);
  }

  public hline(ctx: CanvasRenderingContext2D, x: number, y: number, length: number) {
    if (this.hCanvas.width < length) {
      this.resizeCanvas(this.hCanvas, { width: length, height: 1 });
      this.fillCanvas(this.hCanvas, this.hCtx);
    }

    ctx.drawImage(this.hCanvas, 0, 0, length, 1, x, y, length, 1);
  }

  public vline(ctx: CanvasRenderingContext2D, x: number, y: number, length: number) {
    if (this.vCanvas.height < length) {
      this.resizeCanvas(this.vCanvas, { width: 1, height: length });
      this.fillCanvas(this.vCanvas, this.vCtx);
    }

    ctx.drawImage(this.vCanvas, 0, 0, 1, length, x, y, 1, length);
  }

  public getColor() {
    return this.color;
  }

  public setColor(color: string) {
    this.color = color;
    this.fillCanvas(this.hCanvas, this.hCtx);
    this.fillCanvas(this.vCanvas, this.vCtx);
  }

  private resizeCanvas(canvas: HTMLCanvasElement, size: Size) {
    canvas.width = size.width;
    canvas.height = size.height;
  }

  private fillCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color!;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
