import Konva from "konva";
import { Context } from "konva/lib/Context";
import { ShapeConfig } from "konva/lib/Shape";
import Graphemer from "graphemer";
import { GlyphAtlas } from "./GlyphAtlas";
import { Theme } from "./types";
import { Utils } from "./Utils";

export interface TextConfig extends ShapeConfig {
  text: string;
  fontConfig: "normal" | "bold" | "italic";
  padding?: number;
}

export class Text extends Konva.Shape {
  static glyphAtlas: GlyphAtlas;
  static theme: Theme;

  text: string;
  fontConfig: "normal" | "bold" | "italic";
  padding?: number;

  graphemer: Graphemer;

  constructor(config: TextConfig) {
    super({ ...config, listening: false });

    this.text = config.text;
    this.fontConfig = config.fontConfig;
    this.padding = config.padding;

    this.graphemer = new Graphemer();

    this.sceneFunc(this.drawShape);
  }

  static nextCodePoint(str: string, index: number) {
    if (index < 0 || index >= str.length) {
      throw new Error("Index out of bounds");
    }

    if (index === str.length -1) {
      return str.length -1;
    }

    const nextCodePoint = str.codePointAt(index + 1)!;
    if (nextCodePoint >= 0xdc00 && nextCodePoint <= 0xdfff) {
      return index + 2;
    }

    return index + 1;
  }
  
  drawShape(ctx: Context) {
    const glyphAtlas = Text.glyphAtlas;
    const text       = this.text;
    const padding    = this.padding ?? 0;

    const bitmap      = glyphAtlas.getBitmap();
    const glyphWidth  = glyphAtlas.getGlyphWidth();
    const glyphHeight = glyphAtlas.getGlyphHeight();

    const availableWidth = this.width() - padding * 2;
    let requiredWidth = 0;
    let glyphCount = 0;
    let charIndex = 0;

    const y = (this.height() / 2) - (glyphHeight / 2) + 1;

    ctx.textBaseline = "top";
    ctx.font = Utils.serializeFontSpecifier({
      fontFamily: Text.theme.fontFamily,
      fontSize:   Text.theme.fontSize,
    });
    ctx.fillStyle = Text.theme.fontColor;

    while (requiredWidth + glyphWidth <= availableWidth) {
      const codepoint = this.text.codePointAt(charIndex)!;
      const char = text.charAt(charIndex);

      const x = glyphCount * glyphWidth + padding;

      if (codepoint <= 0xFF) {
	const rect = glyphAtlas.getGlyphBitmapRect(this.fontConfig, char);
	ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, x, y, glyphWidth, glyphHeight);
      } else {
	ctx.fillText(char, x, y, glyphWidth);
      }

      const isSingleCodePoint = codepoint <= 0xFFFF;
      let nextCharIndex: number;
      if (isSingleCodePoint) {
	nextCharIndex = Text.nextCodePoint(text, charIndex);
      } else {
	nextCharIndex = Graphemer.nextBreak(text, charIndex);
      }

      if (nextCharIndex === charIndex) {
	break;
      }
      charIndex = nextCharIndex;

      requiredWidth += glyphWidth;
      glyphCount += 1;
    }
  }

  setText(text: string) {
    this.text = text;
  }
}
