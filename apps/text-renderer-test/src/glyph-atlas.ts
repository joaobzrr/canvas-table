// ---------- Types ----------
export type GlyphAtlas = {
  canvas: HTMLCanvasElement;
  cache: Map<string, Node>;
  root: Node;
  font: string;
  fontHeight: number;
  color: string;
}

export type GlyphAtlasParams = {
  atlasWidth: number;
  atlasHeight: number;
  font: string;
  color: string;
}

export type Node = {
  left: Node | null;
  right: Node | null;

  filled: boolean;

  binWidth: number;
  binHeight: number;

  metrics: GlyphMetrics;
}

export type GlyphMetrics = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  
  hshift:  number;
  vshift:  number;
  advance: number;
}

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Size = {
  width:  number;
  height: number;
}

const DEFAULT_ATLAS_WIDTH  = 1024;
const DEFAULT_ATLAS_HEIGHT = 1024;
const DEFAULT_FONT = "Arial";
const DEFAULT_COLOR = "black";

const GLYPH_OUTER_PADDING = 1;
const GLYPH_INNER_PADDING = 1;
const SEPARATOR = "\u001F";

// ---------- Code ----------
export function create(params?: Partial<GlyphAtlasParams>) {
  const canvas  = document.createElement("canvas");

  const atlasWidth  = params?.atlasWidth  ?? DEFAULT_ATLAS_WIDTH;
  const atlasHeight = params?.atlasHeight ?? DEFAULT_ATLAS_HEIGHT;
  canvas.width  = atlasWidth;
  canvas.height = atlasHeight;

  const cache = new Map<string, Node>();

  const atlas = { canvas, cache } as GlyphAtlas;

  atlas.root = createRootNode(canvas);

  setFont(atlas, params?.font ?? DEFAULT_FONT);

  atlas.color = params?.color ?? DEFAULT_COLOR;

  return atlas;
}

export function getGlyphMetrics(atlas: GlyphAtlas, str: string): GlyphMetrics {
  const { canvas, cache, root, font, color } = atlas;

  const key = [font, color, str].join(SEPARATOR);
  const cached = cache.get(key);
  if (cached) {
    return cached.metrics!;
  }

  const ctx = getContext(canvas);

  ctx.font = font;
  ctx.fillStyle = color;

  const {
    actualBoundingBoxLeft,
    actualBoundingBoxRight,
    actualBoundingBoxAscent,
    actualBoundingBoxDescent,
    width,
  } = ctx.measureText(str);

  const glyphWidth  = actualBoundingBoxLeft   + actualBoundingBoxRight;
  const glyphHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;

  const binWidth  = Math.ceil(glyphWidth  + (GLYPH_INNER_PADDING * 2) + GLYPH_OUTER_PADDING);
  const binHeight = Math.ceil(glyphHeight + (GLYPH_INNER_PADDING * 2) + GLYPH_OUTER_PADDING);
  const binSize = {
    width:  binWidth,
    height: binHeight 
  };

  let node = pack(root, binSize);
  if (!node) {
    clearCanvas(canvas, ctx);

    atlas.cache.clear();

    atlas.root = createRootNode(canvas);

    // Clear atlas and try again
    node = pack(root, binSize)!;
  }

  const { metrics } = node;

  const drawX = metrics.sx + actualBoundingBoxLeft   + GLYPH_INNER_PADDING;
  const drawY = metrics.sy + actualBoundingBoxAscent + GLYPH_INNER_PADDING;

  ctx.fillText(str, drawX, drawY);

  metrics.sw      = binWidth  - GLYPH_OUTER_PADDING;
  metrics.sh      = binHeight - GLYPH_OUTER_PADDING;
  metrics.hshift  = actualBoundingBoxLeft   + GLYPH_INNER_PADDING;
  metrics.vshift  = actualBoundingBoxAscent + GLYPH_INNER_PADDING;
  metrics.advance = width;

  cache.set(key, node);

  return metrics;
}

export function clear(atlas: GlyphAtlas) {
  const ctx = getContext(atlas.canvas);
  clearCanvas(atlas.canvas, ctx);

  atlas.cache.clear();

  atlas.root = createRootNode(atlas.canvas);
}

export function setFont(atlas: GlyphAtlas, font: string) {
  atlas.font = font;

  const ctx = getContext(atlas.canvas);
  const {
    fontBoundingBoxAscent,
    fontBoundingBoxDescent
  } = ctx.measureText("M");
  atlas.fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
}

function pack(node: Node, size: Size): Node | null {
  if (node.left && node.right) {
    const newNode = pack(node.left, size);
    if (newNode !== null) {
      return newNode;
    }
    return pack(node.right, size);
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
      node.left  = createNode(node.metrics.sx, node.metrics.sy + size.height, size.width, dh);
      node.right = createNode(node.metrics.sx + size.width, node.metrics.sy, dw, node.binHeight);
    } else {
      node.left  = createNode(node.metrics.sx, node.metrics.sy + size.height, node.binWidth, dh);
      node.right = createNode(node.metrics.sx + size.width, node.metrics.sy, dw, size.height);
    }

    node.binWidth  = size.width;
    node.binHeight = size.height;
    node.filled = true;

    return node;
  }
}

function getContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }

  return ctx;
}

function clearCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function createRootNode(canvas: HTMLCanvasElement) {
  return createNode(GLYPH_OUTER_PADDING, GLYPH_OUTER_PADDING, canvas.width, canvas.height);
}

function createNode(sx: number, sy: number, binWidth: number, binHeight: number): Node {
  return {
    left: null,
    right: null,
    filled: false,
    binWidth,
    binHeight,
    metrics: { sx, sy }
  } as Node;
}
