import Graphemer from "graphemer";
import { is_whitespace } from "./utils";
import {
  Renderer,
  Make_Renderer_Params,
  Shape,
  Rect_Shape,
  Glyph_Metrics,
  Glyph_Atlas_Node
} from "./types";

const DEFAULT_FONT = "Arial";
const DEFAULT_TEXT_COLOR = "black";
const DEFAULT_LINE_COLOR = "black";
const DEFAULT_GLYPH_ATLAS_WIDTH = 1024;
const DEFAULT_GLYPH_ATLAS_HEIGHT = 1024;
const GLYPH_OUTER_PADDING = 1;
const GLYPH_INNER_PADDING = 1;
const SEPARATOR = "\u001F";

export function make_renderer(params?: Make_Renderer_Params): Renderer {
  const font = params?.font ?? DEFAULT_FONT;
  const text_color = params?.text_color ?? DEFAULT_TEXT_COLOR;
  const line_color = params?.line_color ?? DEFAULT_LINE_COLOR;

  const glyph_atlas_canvas = document.createElement("canvas");
  glyph_atlas_canvas.width = params?.glyph_atlas_width ?? DEFAULT_GLYPH_ATLAS_WIDTH;
  glyph_atlas_canvas.height = params?.glyph_atlas_height ?? DEFAULT_GLYPH_ATLAS_HEIGHT;

  const glyph_atlas_cache = new Map<string, Glyph_Atlas_Node>();
  const glyph_atlas_root_node = make_glyph_atlas_root_node(glyph_atlas_canvas);

  const hline_canvas = document.createElement("canvas");
  hline_canvas.width = 1;
  hline_canvas.height = 1;
  fill_canvas(hline_canvas, line_color);

  const vline_canvas = document.createElement("canvas");
  vline_canvas.width = 1;
  vline_canvas.height = 1;
  fill_canvas(vline_canvas, line_color);

  const render_queue: Shape[] = [];

  return {
    hline_canvas,
    vline_canvas,
    glyph_atlas_canvas,
    glyph_atlas_cache,
    glyph_atlas_root_node,
    font,
    text_color,
    line_color,
    render_queue
  };
}

export function renderer_submit(renderer: Renderer, shape: Shape) {
  renderer.render_queue.unshift(shape);
}

export function renderer_render(
  renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  canvas_width: number,
  canvas_height: number
) {
  renderer.render_queue.sort((a, b) => {
    const { sort_order: a_sort_order = 0 } = a;
    const { sort_order: b_sort_order = 0 } = b;
    return b_sort_order - a_sort_order;
  });

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, canvas_width, canvas_height);

  while (renderer.render_queue.length > 0) {
    const shape = renderer.render_queue.pop()!;

    if (shape.clip_region) {
      ctx.save();
      ctx.clip(shape.clip_region);
    }

    switch (shape.type) {
      case "text": {
        renderer.font = shape.font;
        renderer.text_color = shape.color;
        draw_text(renderer, ctx, shape.text, shape.x, shape.y, shape.max_width, true);
        break;
      }
      case "line": {
        set_line_color(renderer, shape.color);
        if (shape.orientation === "horizontal") {
          draw_horizontal_line(renderer, ctx, shape.x, shape.y, shape.length);
        } else {
          draw_vertical_line(renderer, ctx, shape.x, shape.y, shape.length);
        }

        break;
      }
      case "rect": {
        stroke_rect(renderer, ctx, shape);

        const { fill_color } = shape;
        if (fill_color) {
          const { x, y, width, height } = shape;
          ctx.fillStyle = fill_color;
          ctx.fillRect(x, y, width, height);
        }

        break;
      }
    }

    if (shape.clip_region) {
      ctx.restore();
    }
  }

  ctx.restore();
}

export function clear_glyph_atlas(renderer: Renderer) {
  const ctx = get_context(renderer.glyph_atlas_canvas);

  renderer.glyph_atlas_cache.clear();
  renderer.glyph_atlas_root_node = make_glyph_atlas_root_node(renderer.glyph_atlas_canvas);
  ctx.clearRect(0, 0, renderer.glyph_atlas_canvas.width, renderer.glyph_atlas_canvas.height);
}

function draw_text(
  renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  max_width = Infinity,
  ellipsis = false
) {
  const full_stop_glyph_metrics = get_glyph_metrics(
    renderer,
    ".",
    renderer.font,
    renderer.text_color
  );

  const ellipsis_enabled = ellipsis && max_width !== Infinity;
  const available_content_width = ellipsis_enabled
    ? Math.max(max_width - full_stop_glyph_metrics.advance * 3, 0)
    : max_width;

  let total_content_width = 0;
  let total_content_width_up_to_last_char_before_whitespace = 0;

  let string_index = 0;
  let do_ellipsis = false;

  for (;;) {
    const next_string_index = Graphemer.nextBreak(str, string_index);
    if (next_string_index === string_index) {
      break;
    }
    const grapheme = str.slice(string_index, next_string_index);
    string_index = next_string_index;

    const { sx, sy, sw, sh, hshift, vshift, advance } = get_glyph_metrics(
      renderer,
      grapheme,
      renderer.font,
      renderer.text_color
    );

    if (total_content_width + advance > available_content_width) {
      do_ellipsis = true;
      break;
    }

    const got_whitespace = is_whitespace(grapheme);
    if (!got_whitespace) {
      const dx = x + total_content_width - hshift;
      const dy = y - vshift;
      ctx.drawImage(renderer.glyph_atlas_canvas, sx, sy, sw, sh, dx, dy, sw, sh);
    }

    total_content_width += advance;
    if (!got_whitespace) {
      total_content_width_up_to_last_char_before_whitespace = total_content_width;
    }
  }

  if (ellipsis_enabled && do_ellipsis) {
    let total_width = total_content_width_up_to_last_char_before_whitespace;

    const { sx, sy, sw, sh, hshift, vshift, advance } = full_stop_glyph_metrics;
    const dy = y - vshift;

    for (let i = 0; i < 3; i++) {
      if (total_width + advance > max_width) {
        break;
      }

      const dx = x + total_width - hshift;
      ctx.drawImage(renderer.glyph_atlas_canvas, sx, sy, sw, sh, dx, dy, sw, sh);

      total_width += advance;
    }
  }
}

function stroke_rect(renderer: Renderer, ctx: CanvasRenderingContext2D, shape: Rect_Shape) {
  const { x, y, width, height, stroke_color, stroke_width } = shape;

  if (!stroke_color || !stroke_width) {
    return;
  }

  let x1 = x;
  let y1 = y;
  let x2 = x + width;
  let y2 = y + height;

  set_line_color(renderer, stroke_color);

  for (let i = 0; i < stroke_width; i++) {
    const w = x2 - x1 + 1;
    const h = y2 - y1 + 1;

    draw_horizontal_line(renderer, ctx, x1, y1, w);
    draw_horizontal_line(renderer, ctx, x1, y2, w);
    draw_vertical_line(renderer, ctx, x1, y1, h);
    draw_vertical_line(renderer, ctx, x2, y1, h);

    x1++;
    y1++;
    x2--;
    y2--;
  }
}

function get_glyph_metrics(
  renderer: Renderer,
  str: string,
  font: string,
  color: string
): Glyph_Metrics {
  const key = [font, color, str].join(SEPARATOR);

  const cached = renderer.glyph_atlas_cache.get(key);
  if (cached) {
    return cached.metrics;
  }

  const ctx = get_context(renderer.glyph_atlas_canvas);
  ctx.font = font;
  ctx.fillStyle = color;

  const {
    actualBoundingBoxLeft,
    actualBoundingBoxRight,
    actualBoundingBoxAscent,
    actualBoundingBoxDescent,
    width: advance
  } = ctx.measureText(str);

  const glyph_width = actualBoundingBoxLeft + actualBoundingBoxRight;
  const glyph_height = actualBoundingBoxAscent + actualBoundingBoxDescent;

  const bin_width = Math.ceil(glyph_width + GLYPH_INNER_PADDING * 2 + GLYPH_OUTER_PADDING);
  const bin_height = Math.ceil(glyph_height + GLYPH_INNER_PADDING * 2 + GLYPH_OUTER_PADDING);

  let node = pack_glyph(bin_width, bin_height, renderer.glyph_atlas_root_node);
  if (!node) {
    clear_glyph_atlas(renderer);

    node = pack_glyph(bin_width, bin_height, renderer.glyph_atlas_root_node)!;
    if (!node) {
      throw new Error("Failed to pack glyph");
    }
  }

  const draw_x = node.metrics.sx + actualBoundingBoxLeft + GLYPH_INNER_PADDING;
  const draw_y = node.metrics.sy + actualBoundingBoxAscent + GLYPH_INNER_PADDING;

  ctx.fillText(str, draw_x, draw_y);

  node.metrics.sw = bin_width - GLYPH_OUTER_PADDING;
  node.metrics.sh = bin_height - GLYPH_OUTER_PADDING;
  node.metrics.hshift = actualBoundingBoxLeft + GLYPH_INNER_PADDING;
  node.metrics.vshift = actualBoundingBoxAscent + GLYPH_INNER_PADDING;
  node.metrics.advance = advance;

  renderer.glyph_atlas_cache.set(key, node);

  return node.metrics;
}

function pack_glyph(
  bin_width: number,
  bin_height: number,
  node: Glyph_Atlas_Node
): Glyph_Atlas_Node | null {
  if (node.left && node.right) {
    const new_node = pack_glyph(bin_width, bin_height, node.left);
    if (new_node !== null) {
      return new_node;
    }
    return pack_glyph(bin_width, bin_height, node.right);
  } else {
    if (node.filled) {
      return null;
    }

    if (node.bin_width < bin_width || node.bin_height < bin_height) {
      return null;
    }

    if (node.bin_width === bin_width && node.bin_height === bin_height) {
      node.filled = true;
      return node;
    }

    const dw = node.bin_width - bin_width;
    const dh = node.bin_height - bin_height;
    if (dw > dh) {
      node.left = make_glyph_atlas_node(
        node.metrics.sx,
        node.metrics.sy + bin_height,
        bin_width,
        dh
      );
      node.right = make_glyph_atlas_node(
        node.metrics.sx + bin_width,
        node.metrics.sy,
        dw,
        node.bin_height
      );
    } else {
      node.left = make_glyph_atlas_node(
        node.metrics.sx,
        node.metrics.sy + bin_height,
        node.bin_width,
        dh
      );
      node.right = make_glyph_atlas_node(
        node.metrics.sx + bin_width,
        node.metrics.sy,
        dw,
        bin_height
      );
    }

    node.bin_width = bin_width;
    node.bin_height = bin_height;
    node.filled = true;

    return node;
  }
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
  bin_width: number,
  bin_height: number
): Glyph_Atlas_Node {
  const metrics = { sx, sy } as Glyph_Metrics;

  return {
    left: null,
    right: null,
    filled: false,
    bin_width,
    bin_height,
    metrics
  };
}

function draw_horizontal_line(
  renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number
) {
  if (renderer.hline_canvas.width < length) {
    renderer.hline_canvas.width = length;
    fill_canvas(renderer.hline_canvas, renderer.line_color);
  }
  ctx.drawImage(renderer.hline_canvas, 0, 0, length, 1, x, y, length, 1);
}

function draw_vertical_line(
  renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number
) {
  if (renderer.vline_canvas.height < length) {
    renderer.vline_canvas.height = length;
    fill_canvas(renderer.vline_canvas, renderer.line_color);
  }
  ctx.drawImage(renderer.vline_canvas, 0, 0, 1, length, x, y, 1, length);
}

export function set_line_color(renderer: Renderer, color: string) {
  renderer.line_color = color;
  fill_canvas(renderer.hline_canvas, color);
  fill_canvas(renderer.vline_canvas, color);
}

function fill_canvas(canvas: HTMLCanvasElement, fillStyle: string) {
  const ctx = get_context(canvas);
  ctx.fillStyle = fillStyle;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function get_context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }
  return ctx;
}
