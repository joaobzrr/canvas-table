import Graphemer from "graphemer";
import { GlyphAtlas, GLYPH_ATLAS_BIN_PADDING, GlyphMetrics } from "./GlyphAtlas";
import { getContext, isWhitespace, modf } from "./utils";

const SUBPIXEL_ALIGNMENT_STEPS = 4;
const SUBPIXEL_ALIGNMENT_FRAC = 1 / SUBPIXEL_ALIGNMENT_STEPS;

export type RendererParams = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  glyphAtlasParams?: {
    width?: number;
    height?: number;
  };
};

export type DrawLineCommand = BaseDrawCommand & {
  type: "line";
  orientation: LineOrientation;
  length: number;
  color: string;
};

export type DrawRectCommand = BaseDrawCommand & {
  type: "rect";
  width: number;
  height: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
};

export type DrawTextCommand = BaseDrawCommand & {
  type: "text";
  font: string;
  text: string;
  maxWidth?: number;
  color: string;
};

export type BaseDrawCommand = {
  type: string;
  x: number;
  y: number;
  opacity?: number;
  clipRegion?: Path2D;
  sortOrder?: number;
};

export type DrawCommand = DrawLineCommand | DrawRectCommand | DrawTextCommand;

export type LineOrientation = "horizontal" | "vertical";

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  glyphAtlas: GlyphAtlas;

  hlineCanvas: HTMLCanvasElement;
  vlineCanvas: HTMLCanvasElement;
  hlineCanvasCtx: CanvasRenderingContext2D;
  vlineCanvasCtx: CanvasRenderingContext2D;
  hlineColor: string;
  vlineColor: string;

  commandBuffer: DrawCommand[];

  constructor(params: RendererParams) {
    this.canvas = params.canvas;
    this.ctx = params.ctx;

    this.glyphAtlas = new GlyphAtlas(params.glyphAtlasParams);

    this.hlineCanvas = document.createElement("canvas");
    this.hlineCanvas.width  = 1;
    this.hlineCanvas.height = 1;

    this.vlineCanvas = document.createElement("canvas");
    this.vlineCanvas.width = 1;
    this.vlineCanvas.height = 1;

    this.hlineCanvasCtx = getContext(this.hlineCanvas);
    this.vlineCanvasCtx = getContext(this.vlineCanvas);

    this.hlineColor = "black";
    this.vlineColor = "black";

    this.commandBuffer = [];
  }

  render() {
    this.commandBuffer.sort((a, b) => {
      const { sortOrder: aSortOrder = 0 } = a;
      const { sortOrder: bSortOrder = 0 } = b;
      return bSortOrder - aSortOrder;
    });

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    while (this.commandBuffer.length > 0) {
      const command = this.commandBuffer.pop()!;

      if (command.clipRegion) {
        this.ctx.save();
        this.ctx.clip(command.clipRegion);
      }

      switch (command.type) {
        case "text": {
          const { text, x, y, font, color, maxWidth } = command;

          this.drawText(this.ctx, text, x, y, font, color, maxWidth, true);

          break;
        }
        case "line": {
          const { x, y, length, color } = command;
          
          if (command.orientation === "horizontal") {
            this.drawHorizontalLine(this.ctx, x, y, length, color);
          } else {
            this.drawVerticalLine(this.ctx, x, y, length, color);
          }

          break;
        }
        case "rect": {
          const { x, y, width, height, fillColor, strokeColor, strokeWidth } = command;

          if (fillColor) {
            this.fillRect(this.ctx, x, y, width, height, fillColor);
          }

          if (strokeColor && strokeWidth) {
            this.strokeRect(this.ctx, x, y, width, height, strokeColor, strokeWidth);
          }

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

  drawText(
    ctx: CanvasRenderingContext2D,
    str: string,
    x: number,
    y: number,
    font: string,
    color: string,
    maxWidth = Infinity,
    ellipsis = false
  ) {
    const ellipsisEnabled = ellipsis && maxWidth !== Infinity;

    let availableContentWidth: number;
    if (ellipsisEnabled) {
      const { advance: fullStopAdvance } = this.glyphAtlas.cacheGlyph(".", font);
      availableContentWidth = Math.max(maxWidth - fullStopAdvance * 3, 0);
    } else {
      availableContentWidth = maxWidth;
    }

    let totalContentWidth = 0;
    let totalContentWidthUpToLastCharBeforeWhitespace = 0;

    let stringIndex = 0;
    let doEllipsis = false;

    for (;;) {
      const next_string_index = Graphemer.nextBreak(str, stringIndex);
      if (next_string_index === stringIndex) {
        break;
      }
      const grapheme = str.slice(stringIndex, next_string_index);
      stringIndex = next_string_index;

      const glyphX = x + totalContentWidth;
      const glyphY = y;

      const quantizedSubpixelOffset = this.calculateQuantizedGlyphSubpixelOffset(glyphX);
      const metrics = this.glyphAtlas.cacheGlyph(grapheme, font, color, quantizedSubpixelOffset);
      if (totalContentWidth + metrics.advance > availableContentWidth) {
        doEllipsis = true;
        break;
      }

      const gotWhitespace = isWhitespace(grapheme);
      if (!gotWhitespace) {
        this.blitGlyph(ctx, metrics, glyphX, glyphY, quantizedSubpixelOffset);
      }

      totalContentWidth += metrics.advance;
      if (!gotWhitespace) {
        totalContentWidthUpToLastCharBeforeWhitespace = totalContentWidth;
      }
    }

    if (ellipsisEnabled && doEllipsis) {
      let totalContentWidth = totalContentWidthUpToLastCharBeforeWhitespace;

      for (let i = 0; i < 3; i++) {
        const glyphX = x + totalContentWidth;
        const glyphY = y;

        const quantizedSubpixelOffset = this.calculateQuantizedGlyphSubpixelOffset(glyphX);
        const metrics = this.glyphAtlas.cacheGlyph(".", font, color, quantizedSubpixelOffset);
        if (totalContentWidth + metrics.advance > maxWidth) {
          break;
        }

        this.blitGlyph(ctx, metrics, glyphX, glyphY, quantizedSubpixelOffset);
        totalContentWidth += metrics.advance;
      }
    }
  }

  blitGlyph(
    ctx: CanvasRenderingContext2D,
    metrics: GlyphMetrics,
    x: number,
    y: number,
    quantizedSubpixelOffset: number
  ) {
    const { sx, sy, sw, sh, ascent } = metrics;

    const dx = x - GLYPH_ATLAS_BIN_PADDING - quantizedSubpixelOffset;
    const dy = y - GLYPH_ATLAS_BIN_PADDING - Math.floor(ascent);
    ctx.drawImage(this.glyphAtlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);
  }

  calculateQuantizedGlyphSubpixelOffset(x: number) {
    return SUBPIXEL_ALIGNMENT_FRAC * Math.floor(SUBPIXEL_ALIGNMENT_STEPS * (x - Math.floor(x)));
  }

  fillRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
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
    stroke_width: number
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

  drawHorizontalLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    length: number,
    color: string
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
    color: string
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
