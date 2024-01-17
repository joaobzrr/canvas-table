import { Glyph_Atlas, Glyph_Atlas_Params, Glyph_Metrics, Glyph_Atlas_Node } from "./types";

const DEFAULT_GLYPH_ATLAS_WIDTH = 1024;
const DEFAULT_GLYPH_ATLAS_HEIGHT = 1024;
const GLYPH_OUTER_PADDING = 1;
const GLYPH_INNER_PADDING = 1;
const SEPARATOR = "\u001F";

export function make_glyph_atlas(params?: Glyph_Atlas_Params): Glyph_Atlas {
  const canvas = document.createElement("canvas");
  canvas.width = params?.atlas_width ?? DEFAULT_GLYPH_ATLAS_WIDTH;
  canvas.height = params?.atlas_height ?? DEFAULT_GLYPH_ATLAS_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }

  const cache = new Map<string, Glyph_Atlas_Node>();

  const root_node = make_glyph_atlas_root_node(canvas);

  return {
    canvas,
    ctx,
    cache,
    root_node
  };
}

export function cache_glyph(
  atlas: Glyph_Atlas,
  str: string,
  font: string,
  color: string
): Glyph_Metrics {
  const key = [font, color, str].join(SEPARATOR);

  const cached = atlas.cache.get(key);
  if (cached) {
    return cached.metrics;
  }

  atlas.ctx.font = font;
  atlas.ctx.fillStyle = color;

  const {
    actualBoundingBoxLeft,
    actualBoundingBoxRight,
    actualBoundingBoxAscent,
    actualBoundingBoxDescent,
    width: advance
  } = atlas.ctx.measureText(str);

  const glyph_width = actualBoundingBoxLeft + actualBoundingBoxRight;
  const glyph_height = actualBoundingBoxAscent + actualBoundingBoxDescent;

  const bin_width = Math.ceil(glyph_width + GLYPH_INNER_PADDING * 2 + GLYPH_OUTER_PADDING);
  const bin_height = Math.ceil(glyph_height + GLYPH_INNER_PADDING * 2 + GLYPH_OUTER_PADDING);

  let node = pack_glyph(bin_width, bin_height, atlas.root_node);
  if (!node) {
    clear_glyph_atlas(atlas);

    node = pack_glyph(bin_width, bin_height, atlas.root_node);
    if (!node) {
      throw new Error("Failed to pack glyph");
    }
  }

  const draw_x = node.metrics.sx + actualBoundingBoxLeft + GLYPH_INNER_PADDING;
  const draw_y = node.metrics.sy + actualBoundingBoxAscent + GLYPH_INNER_PADDING;

  atlas.ctx.fillText(str, draw_x, draw_y);

  node.metrics.sw = bin_width - GLYPH_OUTER_PADDING;
  node.metrics.sh = bin_height - GLYPH_OUTER_PADDING;
  node.metrics.hshift = actualBoundingBoxLeft + GLYPH_INNER_PADDING;
  node.metrics.vshift = actualBoundingBoxAscent + GLYPH_INNER_PADDING;
  node.metrics.advance = advance;

  atlas.cache.set(key, node);

  return node.metrics;
}

export function blit_glyph(
  atlas: Glyph_Atlas,
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  ctx.drawImage(atlas.canvas, sx, sy, sw, sh, dx, dy, dw, dh);
}

export function clear_glyph_atlas(atlas: Glyph_Atlas) {
  atlas.cache.clear();
  atlas.root_node = make_glyph_atlas_root_node(atlas.canvas);
  atlas.ctx.clearRect(0, 0, atlas.canvas.width, atlas.canvas.height);
}

function pack_glyph(
  width: number,
  height: number,
  node: Glyph_Atlas_Node
): Glyph_Atlas_Node | null {
  if (node.left && node.right) {
    const new_node = pack_glyph(width, height, node.left);
    if (new_node !== null) {
      return new_node;
    }
    return pack_glyph(width, height, node.right);
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
    node.left = make_glyph_atlas_node(node.metrics.sx, node.metrics.sy + height, width, dh);
    node.right = make_glyph_atlas_node(node.metrics.sx + width, node.metrics.sy, dw, node.height);
  } else {
    node.left = make_glyph_atlas_node(node.metrics.sx, node.metrics.sy + height, node.width, dh);
    node.right = make_glyph_atlas_node(node.metrics.sx + width, node.metrics.sy, dw, height);
  }

  node.width = width;
  node.height = height;
  node.filled = true;

  return node;
}

function make_glyph_atlas_root_node(canvas: HTMLCanvasElement) {
  return make_glyph_atlas_node(
    GLYPH_OUTER_PADDING,
    GLYPH_OUTER_PADDING,
    canvas.width,
    canvas.height
  );
}

function make_glyph_atlas_node(
  sx: number,
  sy: number,
  width: number,
  height: number
): Glyph_Atlas_Node {
  const metrics = { sx, sy } as Glyph_Metrics;

  return {
    left: null,
    right: null,
    filled: false,
    width,
    height,
    metrics
  };
}
