import { GlyphAtlas, FontStyle } from "glyph-atlas";
import Graphemer from "graphemer";

export class TextRenderer {
  private glyphAtlas: GlyphAtlas;
  private graphemer: Graphemer;

  constructor() {
    this.glyphAtlas = new GlyphAtlas();
    this.graphemer = new Graphemer();
  }

  render(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontFamily: string,
    fontSize: string,
    fontStyle: FontStyle,
    x: number,
    y: number
  ) {
    let offsetX = x;
    for (const char of this.graphemer.iterateGraphemes(text)) {
      const glyphData = this.glyphAtlas.getGlyphData(char, fontFamily, fontSize, fontStyle);
      const glyphRect = glyphData.rect;

      let offsetY = y - glyphData.actualBoundingBoxAscent;

      ctx.drawImage(
        this.glyphAtlas.canvas,
        glyphRect.x, glyphRect.y, glyphRect.width, glyphRect.height,
        offsetX, offsetY, glyphRect.width, glyphRect.height);

      offsetX += glyphData.rect.width;
    }
  }
}
