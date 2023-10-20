import Graphemer from "graphemer";
import { GlyphAtlas, GlyphAtlasParams } from "../GlyphAtlas";

export class TextRenderer {
  glyphAtlas: GlyphAtlas;
  ellipsis = false;

  constructor(params?: Partial<GlyphAtlasParams>) {
    this.glyphAtlas = new GlyphAtlas(params);
  }

  render(
    ctx: CanvasRenderingContext2D,
    str: string,
    x: number,
    y: number,
    maxWidth = Infinity,
  ) {
    let availableContentWidth: number;
    if (this.ellipsis && maxWidth !== Infinity) {
      const { advance } = this.glyphAtlas.getGlyphMetrics(".");
      const ellipsisAdvance = advance * 3;
      availableContentWidth = Math.max(maxWidth - ellipsisAdvance, 0);
    } else {
      availableContentWidth = maxWidth;
    }

    let usedWidth = 0;
    let stringIndex = 0;
    let doEllipsis = false;

    for (;;) {
      const nextStringIndex = Graphemer.nextBreak(str, stringIndex);
      if (nextStringIndex === stringIndex) {
        break;
      }
      const grapheme = str.slice(stringIndex, nextStringIndex);
      stringIndex = nextStringIndex;

      const {
        sx,
        sy,
        sw,
        sh,
        hshift,
        vshift,
        advance
      } = this.glyphAtlas.getGlyphMetrics(grapheme);

      if (usedWidth + advance > availableContentWidth) {
        doEllipsis = true;
        break;
      }

      const dx = x + usedWidth - hshift;
      const dy = y - vshift;

      ctx.drawImage(this.glyphAtlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);

      usedWidth += advance;
    }

    if (doEllipsis) {
      const {
        sx,
        sy,
        sw,
        sh,
        hshift,
        vshift,
        advance
      } = this.glyphAtlas.getGlyphMetrics(".");

      const dy = y - vshift;

      for (let i = 0; i < 3; i++) {
        if (usedWidth + advance > maxWidth) {
          break;
        }

        const dx = x + usedWidth - hshift;

        ctx.drawImage(this.glyphAtlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);

        usedWidth += advance;
      }
    }
  }

  setFont(font: string) {
    this.glyphAtlas.setFont(font);
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
