import Konva from "konva";
import { Context } from "konva/lib/Context";
import { ShapeConfig } from "konva/lib/Shape";
import Graphemer from "graphemer";
import { GlyphAtlas } from "./GlyphAtlas";

export interface TextConfig extends ShapeConfig {
  text:       string;
  padding?:   number;
}

export class Text extends Konva.Shape {
  static glyphAtlas: GlyphAtlas;

  text:       string;
  padding?:   number;

  graphemer: Graphemer;

  constructor(config: TextConfig) {
    super({
      ...config,
      listening: false
    });

    this.text = config.text;
    this.padding = config.padding;

    this.graphemer = new Graphemer();

    this.sceneFunc(this.drawShape);
  }
  
  drawShape(context: Context) {
    const glyphAtlas = Text.glyphAtlas;
    const text       = this.text;
    const padding    = this.padding ?? 0;

    const bitmap      = glyphAtlas.getBitmap();
    const glyphWidth  = glyphAtlas.getGlyphWidth();
    const glyphHeight = glyphAtlas.getGlyphHeight();

    const chars = [];
    const availableWidth = this.width() - padding * 2;
    let requiredWidth = 0;
    let ellipsis = false;

    for (const grapheme of this.graphemer.iterateGraphemes(text)) {
      if (requiredWidth > availableWidth) {
        ellipsis = true;
        break;
      }
      chars.push(grapheme);
      requiredWidth += glyphWidth;
    }

    let actualText = this.text;
    if (ellipsis) {
      actualText = chars.slice(0, -3).join("") + "...";
    }

    const y = (this.height() / 2) - (glyphHeight / 2);

    for (let i = 0; i < actualText.length; i++) {
      const char = actualText[i];
      const rect = glyphAtlas.getGlyphBitmapRect("normal", char);

      const x = i * glyphWidth + padding;

      context.drawImage(
        bitmap,
        rect.x, rect.y, rect.width, rect.height,
        x, y, glyphWidth, glyphHeight);
    }
  }
}
