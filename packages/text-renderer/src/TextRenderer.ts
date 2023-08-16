import Graphemer from "graphemer";
import { GlyphAtlas, } from "./GlyphAtlas";
import { Font } from "./types";

export class TextRenderer {
  private glyphAtlas: GlyphAtlas;

  constructor() {
    this.glyphAtlas = new GlyphAtlas({
      textureWidth: 512,
      textureHeight: 512
    });
  }

  render(
    ctx: CanvasRenderingContext2D,
    font: Font,
    str: string,
    x: number,
    y: number,
    maxWidth = Infinity,
    ellipsis = false
  ) {
    let availableContentWidth = maxWidth;
    if (ellipsis && maxWidth !== Infinity) {
      const glyphData = this.glyphAtlas.cache(".", font);
      const ellipsisWidth = glyphData.rect.width * 3;
      availableContentWidth = Math.max(maxWidth - ellipsisWidth, 0);
    }

    let usedWidth = 0;
    let stringIndex = 0;
    let doEllipsis = false;

    while (true) {
      const nextStringIndex = Graphemer.nextBreak(str, stringIndex);
      if (nextStringIndex === stringIndex) {
        break;
      }
      const grapheme = str.slice(stringIndex, nextStringIndex);
      stringIndex = nextStringIndex;

      const glyphData = this.glyphAtlas.cache(grapheme, font);
      const glyphRect = glyphData.rect;
      if (usedWidth + glyphRect.width > availableContentWidth) {
        doEllipsis = true;
        break;
      }

      const screenX = x + usedWidth;
      const screenY = y - glyphData.actualBoundingBoxAscent;
      ctx.drawImage(this.glyphAtlas.canvas, glyphRect.x, glyphRect.y, glyphRect.width, glyphRect.height, screenX, screenY, glyphRect.width, glyphRect.height);

      usedWidth += glyphRect.width;
    }

    if (doEllipsis) {
      const glyphData = this.glyphAtlas.cache(".", font);
      const glyphRect = glyphData.rect;

      const screenY = y - glyphData.actualBoundingBoxAscent;
      for (let i = 0; i < 3; i++) {
        if (usedWidth + glyphRect.width > maxWidth) {
          break;
        }

        const screenX = x + usedWidth;
        ctx.drawImage(this.glyphAtlas.canvas, glyphRect.x, glyphRect.y, glyphRect.width, glyphRect.height, screenX, screenY, glyphRect.width, glyphRect.height);

        usedWidth += glyphRect.width;
      }
    }
  }
}
