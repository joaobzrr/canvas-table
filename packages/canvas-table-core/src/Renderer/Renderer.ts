import { TextRenderer } from './TextRenderer';
import { getContext } from '../utils';
import type { DrawLineCommand, DrawRectCommand, DrawCommand } from './types';

export type RendererParams = {
  ctx: CanvasRenderingContext2D;
  glyphAtlasParams?: {
    width?: number;
    height?: number;
  };
};

export class Renderer {
  ctx: CanvasRenderingContext2D;

  textRenderer: TextRenderer;

  hlineCanvas: HTMLCanvasElement;
  vlineCanvas: HTMLCanvasElement;
  hlineCanvasCtx: CanvasRenderingContext2D;
  vlineCanvasCtx: CanvasRenderingContext2D;
  hlineColor: string;
  vlineColor: string;

  commandBuffer: DrawCommand[];

  constructor(params: RendererParams) {
    this.ctx = params.ctx;

    this.textRenderer = new TextRenderer({
      glyphAtlas: params.glyphAtlasParams,
    });

    this.hlineCanvas = document.createElement('canvas');
    this.hlineCanvas.width = 1;
    this.hlineCanvas.height = 1;

    this.vlineCanvas = document.createElement('canvas');
    this.vlineCanvas.width = 1;
    this.vlineCanvas.height = 1;

    this.hlineCanvasCtx = getContext(this.hlineCanvas);
    this.vlineCanvasCtx = getContext(this.vlineCanvas);

    this.hlineColor = 'black';
    this.vlineColor = 'black';

    this.commandBuffer = [];
  }

  setRenderingContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render() {
    this.commandBuffer.sort((a, b) => {
      const { sortOrder: aSortOrder = 0 } = a;
      const { sortOrder: bSortOrder = 0 } = b;
      return bSortOrder - aSortOrder;
    });

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    while (this.commandBuffer.length > 0) {
      const command = this.commandBuffer.pop()!;

      if (command.clipRegion) {
        this.ctx.save();
        this.ctx.clip(command.clipRegion);
      }

      switch (command.type) {
        case 'text': {
          this.textRenderer.drawText(this.ctx, command);
          break;
        }
        case 'line': {
          this.drawLine(command);
          break;
        }
        case 'rect': {
          this.drawRect(command);
          break;
        }
      }

      if (command.clipRegion) {
        this.ctx.restore();
      }
    }
  }

  pushDrawCommand(shape: DrawCommand) {
    this.commandBuffer.unshift(shape);
  }

  drawRect(command: DrawRectCommand) {
    const { x, y, width, height, fillColor, strokeColor, strokeWidth } = command;

    if (fillColor) {
      this.fillRect(this.ctx, x, y, width, height, fillColor);
    }

    if (strokeColor && strokeWidth) {
      this.strokeRect(this.ctx, x, y, width, height, strokeColor, strokeWidth);
    }
  }

  fillRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }

  strokeRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    stroke_width: number,
  ) {
    let x1 = x;

    let y1 = y;
    let x2 = x + width;
    let y2 = y + height;

    for (let i = 0; i < stroke_width; i++) {
      const w = x2 - x1 + 1;
      const h = y2 - y1 + 1;

      this.drawHorizontalLine(ctx, x1, y1, w, color);
      this.drawHorizontalLine(ctx, x1, y2, w, color);
      this.drawVerticalLine(ctx, x1, y1, h, color);
      this.drawVerticalLine(ctx, x2, y1, h, color);

      x1++;
      y1++;
      x2--;
      y2--;
    }
  }

  drawLine(command: DrawLineCommand) {
    const { x, y, length, color } = command;

    if (command.orientation === 'horizontal') {
      this.drawHorizontalLine(this.ctx, x, y, length, color);
    } else {
      this.drawVerticalLine(this.ctx, x, y, length, color);
    }
  }

  drawHorizontalLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    length: number,
    color: string,
  ) {
    const shouldResizeCanvas = this.hlineCanvas.width < length;
    if (shouldResizeCanvas) {
      this.hlineCanvas.width = length;
    }

    if (shouldResizeCanvas || color !== this.hlineColor) {
      this.hlineColor = color;

      this.hlineCanvasCtx.fillStyle = color;
      this.hlineCanvasCtx.fillRect(0, 0, this.hlineCanvas.width, this.hlineCanvas.height);
    }

    ctx.drawImage(this.hlineCanvas, 0, 0, length, 1, x, y, length, 1);
  }

  drawVerticalLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    length: number,
    color: string,
  ) {
    const shouldResizeCanvas = this.vlineCanvas.height < length;
    if (shouldResizeCanvas) {
      this.vlineCanvas.height = length;
    }

    if (shouldResizeCanvas || color !== this.vlineColor) {
      this.vlineColor = color;

      this.vlineCanvasCtx.fillStyle = color;
      this.vlineCanvasCtx.fillRect(0, 0, this.vlineCanvas.width, this.vlineCanvas.height);
    }

    ctx.drawImage(this.vlineCanvas, 0, 0, 1, length, x, y, 1, length);
  }
}
