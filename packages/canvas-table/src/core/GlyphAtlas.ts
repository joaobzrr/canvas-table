export type GlyphAtlasOptions = {
  textureWidth?:  number;
  textureHeight?: number;
}

export type TextureNode = {
  glyphData: GlyphData;
  left: TextureNode | null;
  right: TextureNode | null;
  filled: boolean;
}

export type GlyphData = {
  rect: Rect;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
}

export type Rect = {
  x: number,
  y: number,
  width: number,
  height: number
}

export type Size = {
  width: number;
  height: number;
}

export type Font = {
  family: string;
  size: string;
  style: FontStyle
  color: string;
}

export type FontStyle = "normal" | "bold" | "italic" | "both";

const DEFAULT_PAGE_WIDTH = 1024;
const DEFAULT_PAGE_HEIGHT = 1024;

export class GlyphAtlas {
  public canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;
  private nodeCache = new Map<string, TextureNode>();

  private root: TextureNode;

  private textureWidth: number;
  private textureHeight: number;

  constructor(options?: GlyphAtlasOptions) {
    this.canvas = document.createElement("canvas");
    this.textureWidth  = options?.textureWidth  ?? DEFAULT_PAGE_WIDTH;
    this.textureHeight = options?.textureHeight ?? DEFAULT_PAGE_HEIGHT;
    this.canvas.width  = this.textureWidth;
    this.canvas.height = this.textureHeight;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create context");
    }
    this.ctx = ctx;
    this.ctx.textBaseline = "alphabetic";

    this.root = this.createNode({
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

    this.nodeCache.set(key, node);
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
