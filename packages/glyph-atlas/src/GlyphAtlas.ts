import { TextureNode, Rect, Size, Font, GlyphData } from "./types";

const INITIAL_PAGE_WIDTH = 512;
const INITIAL_PAGE_HEIGHT = 512;

export class GlyphAtlas {
  public canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;
  private cache = new Map<string, TextureNode>();

  private root: TextureNode;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = INITIAL_PAGE_WIDTH;
    this.canvas.height = INITIAL_PAGE_HEIGHT;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create context");
    }
    this.ctx = ctx;
    this.ctx.textBaseline = "alphabetic";

    this.root = this.createNode({
      x: 0,
      y: 0,
      width: INITIAL_PAGE_WIDTH,
      height: INITIAL_PAGE_HEIGHT
    });
  }

  public getGlyphData(str: string, font: Font): GlyphData {
    const key = `${font.family}-${font.size}-${str}`;
    let cached = this.cache.get(key);
    if (cached) {
      return cached.glyphData;
    }

    this.ctx.font = this.makeFontDescription(font.family, font.size, font.style);
    this.ctx.fillStyle = font.color;

    const metrics = this.ctx.measureText(str);
    const node = this.pack(this.root, {
      width: metrics.width,
      height: metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
    });
    if (!node) {
      throw new Error("Atlas is full");
    }

    node.glyphData.actualBoundingBoxAscent = metrics.actualBoundingBoxAscent;
    node.glyphData.actualBoundingBoxDescent = metrics.actualBoundingBoxDescent;

    const x = node.glyphData.rect.x;
    const y = node.glyphData.rect.y + metrics.actualBoundingBoxAscent;
    this.ctx.fillText(str, x, y);

    this.cache.set(str, node);
    return node.glyphData;
  }

  private pack(node: TextureNode, size: Size): TextureNode | null {
    const glyphData = node.glyphData;
    const glyphRect = glyphData.rect;

    if (node.left && node.right) {
      const newNode = this.pack(node.left, size);
      if (newNode !== null) {
        return newNode;
      }

      return this.pack(node.right, size);
    } else {
      if (node.filled) {
        return null;
      }

      if (glyphRect.width < size.width || node.glyphData.rect.height < size.height) {
        return null;
      }

      if (glyphRect.width === size.width && node.glyphData.rect.height === size.height) {
        node.filled = true;
        return node;
      }

      const dw = glyphRect.width - size.width;
      const dh = glyphRect.height - size.height;
      if (dw > dh) {
        node.left = this.createNode({
          x: glyphRect.x,
          y: glyphRect.y + size.height,
          width: size.width,
          height: dh
        });

        node.right = this.createNode({
          x: glyphRect.x + size.width,
          y: glyphRect.y,
          width: dw,
          height: glyphRect.height
        });
      } else {
        node.left = this.createNode({
          x: glyphRect.x,
          y: glyphRect.y + size.height,
          width: glyphRect.width,
          height: dh
        });

        node.right = this.createNode({
          x: glyphRect.x + size.width,
          y: glyphRect.y,
          width: dw,
          height: size.height
        });
      }
    }

    glyphRect.width = size.width;
    glyphRect.height = size.height;
    node.filled = true;
    return node;
  }

  private createNode(rect: Rect): TextureNode {
    return {
      glyphData: {
        rect,
        actualBoundingBoxAscent: 0,
        actualBoundingBoxDescent: 0,
      },
      left: null,
      right: null,
      filled: false
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
