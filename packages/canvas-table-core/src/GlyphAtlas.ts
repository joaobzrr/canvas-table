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
  ascent: number;
  descent: number;
  advance: number;
};

const DEFAULT_GLYPH_ATLAS_WIDTH = 1024;
const DEFAULT_GLYPH_ATLAS_HEIGHT = 1024;

export const GLYPH_ATLAS_BIN_MARGIN = 1;
export const GLYPH_ATLAS_BIN_PADDING = 1;

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
      ascent: 0,
      descent: 0,
      advance: 0,
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
    const key = [font, color, str, subpixelOffset].join(SEPARATOR);
    const cached = this.cache.get(key);
    if (cached) {
      return cached.metrics;
    }

    this.ctx.font = font;
    this.ctx.fillStyle = color;

    const textMetrics = this.ctx.measureText(str);
    const actualBoundingBoxLeft    = Math.abs(textMetrics.actualBoundingBoxLeft);
    const actualBoundingBoxRight   = Math.abs(textMetrics.actualBoundingBoxRight);
    const actualBoundingBoxAscent  = Math.abs(textMetrics.actualBoundingBoxAscent);
    const actualBoundingBoxDescent = Math.abs(textMetrics.actualBoundingBoxDescent);
    const fontBoundingBoxAscent    = Math.abs(textMetrics.fontBoundingBoxAscent);
    const fontBoundingBoxDescent   = Math.abs(textMetrics.fontBoundingBoxDescent);
    const advance = textMetrics.width;

    let glyphWidth = actualBoundingBoxLeft + actualBoundingBoxRight;
    if (glyphWidth === 0) {
      // @Note: Fallback to fontBoundingBox to calculate glyph dimensions if
      // actualBoundingBox is zeroed. As of January 31 2024, this has only
      // been found to occur on versions of Firefox prior to v.123.
      glyphWidth = advance;
    }

    let glyphHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
    let ascent  = actualBoundingBoxAscent;
    let descent = actualBoundingBoxDescent;
    if (glyphHeight === 0) {
      // @Note: Fallback to fontBoundingBox to calculate glyph dimensions if
      // actualBoundingBox is zeroed. As of January 31 2024, this has only
      // been found to occur on versions of Firefox prior to v.123.
      glyphHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
      ascent  = fontBoundingBoxAscent;
      descent = fontBoundingBoxDescent;
    }
    
    const binWidth  = Math.ceil(glyphWidth  + GLYPH_ATLAS_BIN_PADDING * 2 + GLYPH_ATLAS_BIN_MARGIN);
    const binHeight = Math.ceil(glyphHeight + GLYPH_ATLAS_BIN_PADDING * 2 + GLYPH_ATLAS_BIN_MARGIN);

    let node = this.packGlyph(binWidth, binHeight, this.root);
    if (!node) {
      this.clear();

      node = this.packGlyph(binWidth, binHeight, this.root);
      if (!node) {
        throw new Error("Failed to pack glyph");
      }
    }

    const drawX = node.metrics.sx + GLYPH_ATLAS_BIN_PADDING + subpixelOffset;
    const drawY = node.metrics.sy + GLYPH_ATLAS_BIN_PADDING + Math.floor(ascent);
    this.ctx.fillText(str, drawX, drawY);

    node.metrics.sw = binWidth  - GLYPH_ATLAS_BIN_MARGIN;
    node.metrics.sh = binHeight - GLYPH_ATLAS_BIN_MARGIN;
    node.metrics.ascent  = ascent;
    node.metrics.descent = descent;
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
      GLYPH_ATLAS_BIN_MARGIN,
      GLYPH_ATLAS_BIN_MARGIN,
      this.canvas.width,
      this.canvas.height
    );
  }
}
