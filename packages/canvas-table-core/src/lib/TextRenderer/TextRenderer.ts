import Graphemer from "graphemer";
import { GlyphAtlas, GlyphAtlasParams, GlyphMetrics } from "../GlyphAtlas";
import { isWhitespace } from "../../utils";

export class TextRenderer {
  glyphAtlas: GlyphAtlas;
  ellipsis = false;

  fullStopMetrics: GlyphMetrics | undefined;
  spaceAdvance = -1;

  constructor(params?: Partial<GlyphAtlasParams>) {
    this.glyphAtlas = new GlyphAtlas(params);
  }

  render(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, maxWidth = Infinity) {
    const ellipsisEnabled = this.ellipsis && maxWidth !== Infinity;
    const availableContentWidth = ellipsisEnabled
      ? Math.max(maxWidth - this.fullStopMetrics!.advance * 3, 0)
      : maxWidth;

    let totalContentWidth = 0;
    let totalContentWidthUpToLastCharBeforeWhitespaceChar = 0;

    let stringIndex = 0;
    let doEllipsis = false;

    for (;;) {
      const nextStringIndex = Graphemer.nextBreak(str, stringIndex);
      if (nextStringIndex === stringIndex) {
        break;
      }
      const grapheme = str.slice(stringIndex, nextStringIndex);
      stringIndex = nextStringIndex;

      const { sx, sy, sw, sh, hshift, vshift, advance } = this.glyphAtlas.getGlyphMetrics(grapheme);

      const gotWhitespace = isWhitespace(grapheme);
      const actualAdvance = gotWhitespace ? this.spaceAdvance : advance;

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
        totalContentWidthUpToLastCharBeforeWhitespaceChar = totalContentWidth;
      }
    }

    if (ellipsisEnabled && doEllipsis) {
      let totalWidth = totalContentWidthUpToLastCharBeforeWhitespaceChar;

      const { sx, sy, sw, sh, hshift, vshift, advance } = this.fullStopMetrics!;
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

  setFont(font: string) {
    this.glyphAtlas.setFont(font);

    this.fullStopMetrics = this.glyphAtlas.getGlyphMetrics(".");

    const { advance: spaceAdvance } = this.glyphAtlas.getGlyphMetrics(" ");
    this.spaceAdvance = spaceAdvance;
  }

  setColor(color: string) {
    this.glyphAtlas.setColor(color);
  }

  setEllipsis(ellipsis: boolean) {
    this.ellipsis = ellipsis;
  }

  clearAtlas() {
    this.glyphAtlas.clear();
  }
}
