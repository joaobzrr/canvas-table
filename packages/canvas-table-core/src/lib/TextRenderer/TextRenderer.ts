import Graphemer from "graphemer";
import { GlyphAtlas, GlyphAtlasParams, GlyphMetrics } from "../GlyphAtlas";
import { isWhitespace } from "../../utils";

const DEFAULT_FONT = "Arial";
const DEFAULT_COLOR = "black";

export type TextRendererParams = {
  glyphAtlasParams?: GlyphAtlasParams;
  font?: string;
  color?: string;
};

export class TextRenderer {
  glyphAtlas: GlyphAtlas;
  ellipsis = false;

  fullStopGlyphMetrics: GlyphMetrics;
  spaceGlyphAdvance: number;

  font: string;
  color: string;

  constructor(params?: TextRendererParams) {
    this.glyphAtlas = new GlyphAtlas(params?.glyphAtlasParams);
    this.font = params?.font ?? DEFAULT_FONT;
    this.color = params?.color ?? DEFAULT_COLOR;

    this.fullStopGlyphMetrics = this.getGlyphMetrics(".");
    this.spaceGlyphAdvance = this.getGlyphMetrics(" ").advance;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    str: string,
    x: number,
    y: number,
    maxWidth = Infinity
  ) {
    const ellipsisEnabled = this.ellipsis && maxWidth !== Infinity;
    const availableContentWidth = ellipsisEnabled
      ? Math.max(maxWidth - this.fullStopGlyphMetrics!.advance * 3, 0)
      : maxWidth;

    let totalContentWidth = 0;
    let totalContentWidthUpToLastCharBeforeWhitespace = 0;

    let stringIndex = 0;
    let doEllipsis = false;

    for (;;) {
      const nextStringIndex = Graphemer.nextBreak(str, stringIndex);
      if (nextStringIndex === stringIndex) {
        break;
      }
      const grapheme = str.slice(stringIndex, nextStringIndex);
      stringIndex = nextStringIndex;

      const { sx, sy, sw, sh, hshift, vshift, advance } = this.getGlyphMetrics(grapheme);

      const gotWhitespace = isWhitespace(grapheme);
      const actualAdvance = gotWhitespace ? this.spaceGlyphAdvance : advance;

      if (totalContentWidth + actualAdvance > availableContentWidth) {
        doEllipsis = true;
        break;
      }

      if (!gotWhitespace) {
        const dx = x + totalContentWidth - hshift;
        const dy = y - vshift;
        ctx.drawImage(this.glyphAtlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);
      }

      totalContentWidth += advance;
      if (!gotWhitespace) {
        totalContentWidthUpToLastCharBeforeWhitespace = totalContentWidth;
      }
    }

    if (ellipsisEnabled && doEllipsis) {
      let totalWidth = totalContentWidthUpToLastCharBeforeWhitespace;

      const { sx, sy, sw, sh, hshift, vshift, advance } = this.fullStopGlyphMetrics!;
      const dy = y - vshift;

      for (let i = 0; i < 3; i++) {
        if (totalWidth + advance > maxWidth) {
          break;
        }

        const dx = x + totalWidth - hshift;
        ctx.drawImage(this.glyphAtlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);

        totalWidth += advance;
      }
    }
  }

  public setFont(font: string) {
    this.font = font;
    this.fullStopGlyphMetrics = this.getGlyphMetrics(".");
    this.spaceGlyphAdvance = this.getGlyphMetrics(" ").advance;
  }

  public setColor(color: string) {
    this.color = color;
  }

  public setEllipsis(ellipsis: boolean) {
    this.ellipsis = ellipsis;
  }

  public clearAtlas() {
    this.glyphAtlas.clear();
  }

  private getGlyphMetrics(grapheme: string) {
    return this.glyphAtlas.getGlyphMetrics(grapheme, this.font, this.color);
  }
}
