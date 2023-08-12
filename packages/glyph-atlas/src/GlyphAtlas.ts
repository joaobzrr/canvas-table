import { TextureNode, Rect, Size } from "./types";

const INITIAL_PAGE_WIDTH  = 512;
const INITIAL_PAGE_HEIGHT = 512;

export class GlyphAtlas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cache = new Map<string, TextureNode>();

  private root: TextureNode;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width  = INITIAL_PAGE_WIDTH;
    this.canvas.height = INITIAL_PAGE_HEIGHT;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create context");
    }
    this.ctx = ctx;
    this.ctx.textBaseline = "top"; // Not correct

    this.root = this.createNode({
      x: 0,
      y: 0,
      width: INITIAL_PAGE_WIDTH,
      height: INITIAL_PAGE_HEIGHT
    });
  }

  cacheGlyph(char: string, fontFamily: string, fontSize: string) {
    const key = `${fontFamily}-${fontSize}-${char}`;
    let cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    this.ctx.font = `${fontSize} ${fontFamily}`;
    const metrics = this.ctx.measureText(char);
    const node = this.pack(this.root, {
      width: metrics.width,
      height: metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
    });
    if (!node) {
      throw new Error("Atlas is full");
    }

    this.ctx.fillText(char, node.rect.x, node.rect.y);
    this.cache.set(char, node);
  }

  private pack(node: TextureNode, size: Size): TextureNode | null {
    if (node.left && node.right) {
      const newNode = this.pack(node.left, size);
      if (newNode !== null) {
	return newNode;
      }
      return this.pack(node.right, size);
    } else {
      if (node.rect.width < size.width || node.rect.height < size.height) {
	return null;
      }

      if (node.rect.width  === size.width && node.rect.height === size.height) {
	node.filled = true;
	return node;
      }

      const dw = node.rect.width  - size.width;
      const dh = node.rect.height - size.height;
      if (dw > dh) {
	node.left = this.createNode({
	  x: node.rect.x,
	  y: node.rect.y + size.height,
	  width: size.width,
	  height: dh
	});

	node.right = this.createNode({
	  x: node.rect.x + size.width,
	  y: node.rect.y,
	  width: dw,
	  height: node.rect.height
	});
      } else {
	node.left = this.createNode({
	  x: node.rect.x,
	  y: node.rect.y + size.height,
	  width: node.rect.width,
	  height: dh
	});

	node.right = this.createNode({
	  x: node.rect.x + size.width,
	  y: node.rect.y,
	  width: dw,
	  height: size.height
	});
      }
    }

    node.filled = true;
    return node;
  }

  private createNode(rect: Rect): TextureNode {
    return {
      rect,
      left: null,
      right: null,
      filled: false
    };
  }
}
