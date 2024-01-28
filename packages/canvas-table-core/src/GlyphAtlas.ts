import { getContext } from "./utils";

export type GlyphAtlasParams = {
  width?: number;
  height?: number;
};

export type GlyphAtlasNode = {
  left: GlyphAtlasNode | null;
  right: GlyphAtlasNode | null;
  filled: boolean;
  width: number;
  height: number;
  metrics: GlyphMetrics;
};

export type GlyphMetrics = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  actualBoundingBoxLeft: number;
  actualBoundingBoxRight: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  advance: number;
};

const DEFAULT_GLYPH_ATLAS_WIDTH = 1024;
const DEFAULT_GLYPH_ATLAS_HEIGHT = 1024;

export const BIN_MARGIN = 1;
export const BIN_PADDING = 1;

const SUBPIXEL_ALIGNMENT_STEPS = 4;
const SUBPIXEL_ALIGNMENT_FRAC = 1 / SUBPIXEL_ALIGNMENT_STEPS;

const SEPARATOR = "\u001F";

export class GlyphAtlas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cache: Map<string, GlyphAtlasNode>;
  root: GlyphAtlasNode;

  constructor(params?: GlyphAtlasParams) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = params?.width ?? DEFAULT_GLYPH_ATLAS_WIDTH;
    this.canvas.height = params?.height ?? DEFAULT_GLYPH_ATLAS_HEIGHT;
    this.ctx = getContext(this.canvas);
    this.cache = new Map<string, GlyphAtlasNode>();
    this.root = this.createRootNode();
  }

  static createNode(sx: number, sy: number, width: number, height: number) {
    const metrics = {
      sx,
      sy,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 0,
      actualBoundingBoxAscent: 0,
      actualBoundingBoxDescent: 0
    } as GlyphMetrics;

    return {
      left: null,
      right: null,
      filled: false,
      width,
      height,
      metrics
    };
  }

  cacheGlyph(str: string, font: string, color = "black", subpixelOffset = 0) {
    const subpixelAlignment = Math.floor(SUBPIXEL_ALIGNMENT_STEPS * subpixelOffset);
    const quantizedSubpixelOffset = SUBPIXEL_ALIGNMENT_FRAC * subpixelAlignment;

    const key = [font, color, str, subpixelAlignment].join(SEPARATOR);
    const cached = this.cache.get(key);
    if (cached) {
      return cached.metrics;
    }

    this.ctx.font = font;
    this.ctx.fillStyle = color;

    const textMetrics = this.ctx.measureText(str);
    // @Note Given that the textAlign property is set to the default value of "start",
    // should we would expect the value of actualBoundingBoxLeft to be zero?
    const actualBoundingBoxLeft    = Math.abs(textMetrics.actualBoundingBoxLeft);
    const actualBoundingBoxRight   = Math.abs(textMetrics.actualBoundingBoxRight);
    const actualBoundingBoxAscent  = Math.abs(textMetrics.actualBoundingBoxAscent);
    const actualBoundingBoxDescent = Math.abs(textMetrics.actualBoundingBoxDescent);
    const advance = textMetrics.width;

    const glyphWidth  = actualBoundingBoxLeft   + actualBoundingBoxRight;
    const glyphHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;

    const binWidth  = Math.ceil(glyphWidth  + BIN_PADDING * 2 + BIN_MARGIN);
    const binHeight = Math.ceil(glyphHeight + BIN_PADDING * 2 + BIN_MARGIN);

    let node = this.packGlyph(binWidth, binHeight, this.root);
    if (!node) {
      this.clear();

      node = this.packGlyph(binWidth, binHeight, this.root);
      if (!node) {
        throw new Error("Failed to pack glyph");
      }
    }

    const drawX = node.metrics.sx + BIN_PADDING + quantizedSubpixelOffset;
    const drawY = node.metrics.sy + BIN_PADDING + Math.floor(actualBoundingBoxAscent);
    this.ctx.fillText(str, drawX, drawY);

    node.metrics.sw = binWidth  - BIN_MARGIN;
    node.metrics.sh = binHeight - BIN_MARGIN;

    node.metrics.actualBoundingBoxLeft = actualBoundingBoxLeft;
    node.metrics.actualBoundingBoxRight = actualBoundingBoxRight;
    node.metrics.actualBoundingBoxAscent = actualBoundingBoxAscent;
    node.metrics.actualBoundingBoxDescent = actualBoundingBoxDescent;
    node.metrics.advance = advance;

    this.cache.set(key, node);

    return node.metrics;
  }

  packGlyph(width: number, height: number, node: GlyphAtlasNode): GlyphAtlasNode | null {
    if (node.left && node.right) {
      const newNode = this.packGlyph(width, height, node.left);
      if (newNode !== null) {
        return newNode;
      }
      return this.packGlyph(width, height, node.right);
    }

    if (node.filled) {
      return null;
    }

    if (node.width < width || node.height < height) {
      return null;
    }

    if (node.width === width && node.height === height) {
      node.filled = true;
      return node;
    }

    const dw = node.width - width;
    const dh = node.height - height;
    if (dw > dh) {
      node.left = GlyphAtlas.createNode(node.metrics.sx, node.metrics.sy + height, width, dh);
      node.right = GlyphAtlas.createNode(node.metrics.sx + width, node.metrics.sy, dw, node.height);
    } else {
      node.left = GlyphAtlas.createNode(node.metrics.sx, node.metrics.sy + height, node.width, dh);
      node.right = GlyphAtlas.createNode(node.metrics.sx + width, node.metrics.sy, dw, height);
    }

    node.width = width;
    node.height = height;
    node.filled = true;

    return node;
  }

  clear() {
    this.cache.clear();
    this.root = this.createRootNode();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  createRootNode() {
    return GlyphAtlas.createNode(
      BIN_MARGIN,
      BIN_MARGIN,
      this.canvas.width,
      this.canvas.height
    );
  }
}
