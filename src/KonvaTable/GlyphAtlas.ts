import { Utils } from "./Utils";
import { FontConfig, FontSpecifier, Theme } from "./types";

export class GlyphAtlas {
  static fontConfigs: FontConfig[] = [
    {
      configName: "normal"
    },
    {
      configName: "bold",
      fontWeight: "bold"
    },
    {
      configName: "italic",
      fontStyle: "italic"
    }
  ];

  static latinChars = Array.from({ length: 255 }, (_, i) => {
    return String.fromCharCode(i);
  }).join("");

  static theme: Theme;

  bitmap: ImageBitmap;
  glyphWidth: number;
  glyphHeight: number;

  constructor(bitmap: ImageBitmap, glyphWidth: number, glyphHeight: number) {
    this.bitmap = bitmap;
    this.glyphWidth = glyphWidth;
    this.glyphHeight = glyphHeight;
  }

  static async create(fontFamily: string, fontSize: string) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    if (!ctx) {
      throw new Error("Failed to instantiate context");
    }

    function setupContext(specifier: FontSpecifier) {
      ctx.font = Utils.serializeFontSpecifier(specifier);
      ctx.textBaseline = "top";
      ctx.fillStyle = GlyphAtlas.theme.fontColor;
    }

    // @Note Setup context for taking measurements
    setupContext({ fontFamily, fontSize });

    const metrics = ctx.measureText(GlyphAtlas.latinChars);
    canvas.width = metrics.width;

    const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    canvas.height = glyphHeight * GlyphAtlas.fontConfigs.length;

    for (const [index, config] of GlyphAtlas.fontConfigs.entries()) {
      setupContext({ ...config, fontFamily, fontSize });
      ctx.fillText(GlyphAtlas.latinChars, 0, index * glyphHeight);
    }

    const bitmap = await createImageBitmap(canvas);
    const glyphWidth = ctx.measureText("M").width;

    return new GlyphAtlas(bitmap, glyphWidth, glyphHeight);
  }

  getGlyphBitmapRect(configName: string, char: string) {
    if (configName === "bold") {
      debugger;
    }

    const configIndex = GlyphAtlas.fontConfigs.findIndex(
      config => config.configName === configName);

    if (configIndex === -1) {
      throw new Error(`Font config named ${configName} does not exist`);
    }

    return {
      x: char.charCodeAt(0) * this.glyphWidth,
      y: configIndex * this.glyphHeight,
      width: this.glyphWidth,
      height: this.glyphHeight
    };
  }

  getBitmap() {
    return this.bitmap;
  }

  getGlyphWidth() {
    return this.glyphWidth;
  }
  
  getGlyphHeight() {
    return this.glyphHeight;
  }
}
