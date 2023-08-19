import {
  GlyphAtlasOptions,
  TextureNode,
  Rect,
  Size,
  Font,
  GlyphData
} from "./types";

const DEFAULT_PAGE_WIDTH = 1024;
const DEFAULT_PAGE_HEIGHT = 1024;
const GLYPH_PADDING = 1;

export class GlyphAtlas {
  public canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;
  private nodeCache = new Map<string, TextureNode>();

  private root: TextureNode;

  private textureWidth: number;
  private textureHeight: number;

  constructor(options?: GlyphAtlasOptions) {
    this.canvas = document.createElement("canvas");
    this.textureWidth = options?.textureWidth ?? DEFAULT_PAGE_WIDTH;
    this.textureHeight = options?.textureHeight ?? DEFAULT_PAGE_HEIGHT;
    this.canvas.width = this.textureWidth;
    this.canvas.height = this.textureHeight;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create context");
    }
    this.ctx = ctx;
    this.ctx.textBaseline = "alphabetic";

    this.root = this.makeNode({
      x: 0,
      y: 0,
      width: this.textureWidth,
      height: this.textureHeight
    });
  }

  public cache(str: string, font: Font): GlyphData {
    const key = `${font.family},${font.size},${font.style},${font.color},${str}`;
    let cached = this.nodeCache.get(key);
    if (cached) {
      return cached.glyphData!;
    }

    this.ctx.font = this.makeFontDescription(font.family, font.size, font.style);
    this.ctx.fillStyle = font.color;

    const metrics = this.ctx.measureText(str);
    const size = {
      width: metrics.width,
      height: metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
    };

    let node = this.pack(this.root, size, GLYPH_PADDING);
    if (!node) {
      this.clear();
      node = this.pack(this.root, size, GLYPH_PADDING)!;
    }

    node.glyphData = {} as GlyphData;
    node.glyphData.rect = this.makeGlyphRect(node.rect, GLYPH_PADDING);
    node.glyphData.verticalShift = metrics.actualBoundingBoxAscent;

    const x = node.glyphData.rect.x;
    const y = node.glyphData.rect.y + metrics.actualBoundingBoxAscent;
    this.ctx.fillText(str, x, y);

    this.nodeCache.set(key, node);
    return node.glyphData;
  }

  private pack(node: TextureNode, size: Size, padding: number) {
    const width  = size.width  + padding * 2;
    const height = size.height + padding * 2;
    return this.doPack(node, { width, height });
  }

  private doPack(node: TextureNode, size: Size): TextureNode | null {
    if (node.left && node.right) {
      const newNode = this.doPack(node.left, size);
      if (newNode !== null) {
        return newNode;
      }

      return this.doPack(node.right, size);
    } else {
      if (node.filled) {
        return null;
      }

      if (node.rect.width < size.width || node.rect.height < size.height) {
        return null;
      }

      if (node.rect.width === size.width && node.rect.height === size.height) {
        node.filled = true;
        return node;
      }

      const dw = node.rect.width - size.width;
      const dh = node.rect.height - size.height;
      if (dw > dh) {
        node.left = this.makeNode({
          x: node.rect.x,
          y: node.rect.y + size.height,
          width: size.width,
          height: dh
        });

        node.right = this.makeNode({
          x: node.rect.x + size.width,
          y: node.rect.y,
          width: dw,
          height: node.rect.height
        });
      } else {
        node.left = this.makeNode({
          x: node.rect.x,
          y: node.rect.y + size.height,
          width: node.rect.width,
          height: dh
        });

        node.right = this.makeNode({
          x: node.rect.x + size.width,
          y: node.rect.y,
          width: dw,
          height: size.height
        });
      }
    }

    node.rect.width = size.width;
    node.rect.height = size.height;
    node.filled = true;
    return node;
  }

  private clear() {
    this.ctx.clearRect(0, 0, this.textureWidth, this.textureHeight);
    this.root = this.makeNode({
      x: 0,
      y: 0,
      width: this.textureWidth,
      height: this.textureHeight
    });
  }

  private makeNode(rect: Rect): TextureNode {
    return {
      rect,
      left: null,
      right: null,
      filled: false
    };
  }

  private makeGlyphRect(rect: Rect, padding: number): Rect {
    return {
      x: rect.x + padding,
      y: rect.y + padding,
      width: rect.width - padding * 2,
      height: rect.height - padding * 2
    };
  }

  public makeFontDescription(fontFamily: string, fontSize: string, fontStyle?: string) {
    let font = `${fontSize} ${fontFamily}`;
    if (!fontStyle) {
      return font;
    }

    switch (fontStyle) {
      case "bold": {
        font = "bold " + font;
      } break;
      case "italic": {
        font = "italic " + font;
      } break;
      case "both": {
        font = "italic bold " + font;
      } break;
    }
    return font;
  }
}
