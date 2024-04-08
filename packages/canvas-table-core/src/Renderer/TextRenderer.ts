import Graphemer from "graphemer";
import { GlyphAtlas, GLYPH_ATLAS_BIN_PADDING, type GlyphMetrics } from "./GlyphAtlas";
import { PreparedText } from "./PreparedText";
import { isWhitespace } from "../utils";
import type { DrawTextCommand } from "./types";

export type TextRendererParams = {
  glyphAtlas?: {
    width?: number;
    height?: number;
  }
}

const SUBPIXEL_ALIGNMENT_STEPS = 4;
const SUBPIXEL_ALIGNMENT_FRAC = 1 / SUBPIXEL_ALIGNMENT_STEPS;

export class TextRenderer {
  glyphAtlas: GlyphAtlas;

  constructor(params?: TextRendererParams) {
    this.glyphAtlas = new GlyphAtlas(params?.glyphAtlas);
  }

  drawText(ctx: CanvasRenderingContext2D, command: DrawTextCommand) {
    const { chars, subpixelOffsets, x, y, font, color } = command;
    
    let width = 0;
    for (const [index, char] of chars.entries()) {
      const subpixelOffset = subpixelOffsets[index];
      const metrics = this.glyphAtlas.cacheGlyph(char, font, color, subpixelOffset);

      const gotWhitespace = isWhitespace(char);
      if (!gotWhitespace) {
        this.blitGlyph(ctx, metrics, x + width, y, subpixelOffset);
      }

      width += metrics.advance;
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

  prepareText(
    str: string,
    x: number,
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

    let stringOffset = 0;
    let shouldDoEllipsis = false;

    const preparedText = new PreparedText();

    for (;;) {
      const nextStringOffset = Graphemer.nextBreak(str, stringOffset);
      if (nextStringOffset === stringOffset) {
        break;
      }
      const char = str.slice(stringOffset, nextStringOffset);
      stringOffset = nextStringOffset;

      const glyphX = x + totalContentWidth;
      const subpixelOffset = this.calculateQuantizedGlyphSubpixelOffset(glyphX);

      const metrics = this.glyphAtlas.cacheGlyph(char, font, color, subpixelOffset);
      if (totalContentWidth + metrics.advance > availableContentWidth) {
        shouldDoEllipsis = true;
        break;
      }

      preparedText.pushChar(char, subpixelOffset);

      totalContentWidth += metrics.advance;
      if (!isWhitespace(char)) {
        totalContentWidthUpToLastCharBeforeWhitespace = totalContentWidth;
      }
    }

    if (!ellipsisEnabled || !shouldDoEllipsis) {
      return preparedText;
    }

    totalContentWidth = totalContentWidthUpToLastCharBeforeWhitespace;
    for (let periodCount = 0; periodCount < 3; periodCount++) {
      const glyphX = x + totalContentWidth;
      const subpixelOffset = this.calculateQuantizedGlyphSubpixelOffset(glyphX);

      const metrics = this.glyphAtlas.cacheGlyph(".", font, color, subpixelOffset);
      if (totalContentWidth + metrics.advance > maxWidth) {
        break;
      }

      preparedText.pushChar(".", subpixelOffset);

      totalContentWidth += metrics.advance;
    }

    return preparedText;
  }

  calculateQuantizedGlyphSubpixelOffset(x: number) {
    return SUBPIXEL_ALIGNMENT_FRAC * Math.floor(SUBPIXEL_ALIGNMENT_STEPS * (x - Math.floor(x)));
  }
}
