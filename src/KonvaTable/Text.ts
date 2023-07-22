import Konva from "konva";
import { Context } from "konva/lib/Context";
import { ShapeConfig } from "konva/lib/Shape";
import Graphemer from "graphemer";
import { GlyphAtlas } from "./GlyphAtlas";
import { Utils } from "./Utils";

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

    const availableWidth = this.width() - padding * 2;
    let requiredWidth = 0;
    let graphemeCount = 0;
    let charIndex = 0;

    const y = (this.height() / 2) - (glyphHeight / 2);

    while (requiredWidth + glyphWidth <= availableWidth && charIndex < text.length - 1) {
      const codepoint = this.text.codePointAt(charIndex)!;
      if (codepoint <= 255) {
	const char = text.charAt(charIndex);
	const rect = glyphAtlas.getGlyphBitmapRect("normal", char);

	const x = graphemeCount * glyphWidth + padding;

	context.drawImage(
	  bitmap,
	  rect.x, rect.y, rect.width, rect.height,
	  x, y, glyphWidth, glyphHeight);
      } else {
	throw new Error("Not implemented");
      }

      const isSingleCodePoint = codepoint <= 0xFFFF;
      if (isSingleCodePoint) {
	charIndex = Utils.nextCodePoint(text, charIndex);
      } else {
	charIndex = Graphemer.nextBreak(text, charIndex);
      }

      requiredWidth += glyphWidth;
      graphemeCount += 1;
    }
  }
}
