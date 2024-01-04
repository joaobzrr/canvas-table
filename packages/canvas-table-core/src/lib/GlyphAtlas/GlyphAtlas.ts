import { Size } from "../../types";
import { GlyphAtlasParams, GlyphMetrics, Node } from "./types";

const DEFAULT_ATLAS_WIDTH = 1024;
const DEFAULT_ATLAS_HEIGHT = 1024;

const GLYPH_OUTER_PADDING = 1;
const GLYPH_INNER_PADDING = 1;
const SEPARATOR = "\u001F";

export class GlyphAtlas {
  canvas: HTMLCanvasElement;
  cache: Map<string, Node>;
  root: Node;

  constructor(params?: GlyphAtlasParams) {
    this.canvas = document.createElement("canvas");

    const atlasWidth = params?.atlasWidth ?? DEFAULT_ATLAS_WIDTH;
    const atlasHeight = params?.atlasHeight ?? DEFAULT_ATLAS_HEIGHT;
    this.canvas.width = atlasWidth;
    this.canvas.height = atlasHeight;

    this.cache = new Map<string, Node>();

    this.root = GlyphAtlas.createRootNode(this.canvas);
  }

  public getGlyphMetrics(str: string, font: string, color: string): GlyphMetrics {
    const key = [font, color, str].join(SEPARATOR);

    const cached = this.cache.get(key);
    if (cached) {
      return cached.metrics;
    }

    const ctx = this.getContext();
    ctx.font = font;
    ctx.fillStyle = color;

    const {
      actualBoundingBoxLeft,
      actualBoundingBoxRight,
      actualBoundingBoxAscent,
      actualBoundingBoxDescent,
      width
    } = ctx.measureText(str);

    const glyphWidth = actualBoundingBoxLeft + actualBoundingBoxRight;
    const glyphHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;

    const binWidth = Math.ceil(glyphWidth + GLYPH_INNER_PADDING * 2 + GLYPH_OUTER_PADDING);
    const binHeight = Math.ceil(glyphHeight + GLYPH_INNER_PADDING * 2 + GLYPH_OUTER_PADDING);
    const binSize = {
      width: binWidth,
      height: binHeight
    };

    let node = this.pack(this.root, binSize);
    if (!node) {
      GlyphAtlas.clearCanvas(this.canvas, ctx);

      this.cache.clear();

      this.root = GlyphAtlas.createRootNode(this.canvas);

      // Clear atlas and try again
      node = this.pack(this.root, binSize)!;
    }

    const { metrics } = node;

    const drawX = metrics.sx + actualBoundingBoxLeft + GLYPH_INNER_PADDING;
    const drawY = metrics.sy + actualBoundingBoxAscent + GLYPH_INNER_PADDING;

    ctx.fillText(str, drawX, drawY);

    metrics.sw = binWidth - GLYPH_OUTER_PADDING;
    metrics.sh = binHeight - GLYPH_OUTER_PADDING;
    metrics.hshift = actualBoundingBoxLeft + GLYPH_INNER_PADDING;
    metrics.vshift = actualBoundingBoxAscent + GLYPH_INNER_PADDING;
    metrics.advance = width;

    this.cache.set(key, node);

    return metrics;
  }

  public clear() {
    const ctx = this.getContext();
    GlyphAtlas.clearCanvas(this.canvas, ctx);

    this.cache.clear();

    this.root = GlyphAtlas.createRootNode(this.canvas);
  }

  private pack(node: Node, size: Size): Node | null {
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

      if (node.binWidth < size.width || node.binHeight < size.height) {
        return null;
      }

      if (node.binWidth === size.width && node.binHeight === size.height) {
        node.filled = true;
        return node;
      }

      const dw = node.binWidth - size.width;
      const dh = node.binHeight - size.height;
      if (dw > dh) {
        node.left = GlyphAtlas.createNode(
          node.metrics.sx,
          node.metrics.sy + size.height,
          size.width,
          dh
        );
        node.right = GlyphAtlas.createNode(
          node.metrics.sx + size.width,
          node.metrics.sy,
          dw,
          node.binHeight
        );
      } else {
        node.left = GlyphAtlas.createNode(
          node.metrics.sx,
          node.metrics.sy + size.height,
          node.binWidth,
          dh
        );
        node.right = GlyphAtlas.createNode(
          node.metrics.sx + size.width,
          node.metrics.sy,
          dw,
          size.height
        );
      }

      node.binWidth = size.width;
      node.binHeight = size.height;
      node.filled = true;

      return node;
    }
  }

  private getContext() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not instantiate canvas context");
    }
    return ctx;
  }

  private static clearCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private static createRootNode(canvas: HTMLCanvasElement) {
    return GlyphAtlas.createNode(
      GLYPH_OUTER_PADDING,
      GLYPH_OUTER_PADDING,
      canvas.width,
      canvas.height
    );
  }

  private static createNode(sx: number, sy: number, binWidth: number, binHeight: number): Node {
    return {
      left: null,
      right: null,
      filled: false,
      binWidth,
      binHeight,
      metrics: { sx, sy }
    } as Node;
  }
}
