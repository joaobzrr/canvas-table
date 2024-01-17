import Graphemer from "graphemer";
import { make_glyph_atlas, cache_glyph, blit_glyph } from "./glyph_atlas";
import { is_whitespace } from "./utils";
import { Renderer, Make_Renderer_Params, Shape } from "./types";

export function make_renderer(params?: Make_Renderer_Params): Renderer {
  const glyph_atlas = make_glyph_atlas(params?.glyph_atlas_params);

  const hline_canvas = document.createElement("canvas");
  hline_canvas.width = 1;
  hline_canvas.height = 1;

  const vline_canvas = document.createElement("canvas");
  vline_canvas.width = 1;
  vline_canvas.height = 1;

  const hline_canvas_ctx = get_context(hline_canvas);
  const vline_canvas_ctx = get_context(vline_canvas);

  const hline_color = "black";
  const vline_color = "black";

  const render_queue: Shape[] = [];

  return {
    glyph_atlas,
    hline_canvas,
    vline_canvas,
    hline_canvas_ctx,
    vline_canvas_ctx,
    hline_color,
    vline_color,
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
        const { text, x, y, font, color, max_width } = shape;

        draw_text(renderer, ctx, text, x, y, font, color, max_width, true);
        break;
      }
      case "line": {
        const { x, y, length, color } = shape;

        if (shape.orientation === "horizontal") {
          draw_horizontal_line(renderer, ctx, x, y, length, color);
        } else {
          draw_vertical_line(renderer, ctx, x, y, length, color);
        }

        break;
      }
      case "rect": {
        const { x, y, width, height, fill_color, stroke_color, stroke_width } = shape;

        if (fill_color) {
          fill_rect(renderer, ctx, x, y, width, height, fill_color);
        }

        if (stroke_color && stroke_width) {
          stroke_rect(renderer, ctx, x, y, width, height, stroke_color, stroke_width);
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

function draw_text(
  renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  font: string,
  color: string,
  max_width = Infinity,
  ellipsis = false
) {
  const full_stop_glyph_metrics = cache_glyph(renderer.glyph_atlas, ".", font, color);

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

    const { sx, sy, sw, sh, hshift, vshift, advance } = cache_glyph(
      renderer.glyph_atlas,
      grapheme,
      font,
      color
    );

    if (total_content_width + advance > available_content_width) {
      do_ellipsis = true;
      break;
    }

    const got_whitespace = is_whitespace(grapheme);
    if (!got_whitespace) {
      const dx = x + total_content_width - hshift;
      const dy = y - vshift;
      blit_glyph(renderer.glyph_atlas, ctx, sx, sy, sw, sh, dx, dy, sw, sh);
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
      blit_glyph(renderer.glyph_atlas, ctx, sx, sy, sw, sh, dx, dy, sw, sh);

      total_width += advance;
    }
  }
}

function fill_rect(
  _renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function stroke_rect(
  renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  stroke_width: number
) {
  let x1 = x;
  let y1 = y;
  let x2 = x + width;
  let y2 = y + height;

  for (let i = 0; i < stroke_width; i++) {
    const w = x2 - x1 + 1;
    const h = y2 - y1 + 1;

    draw_horizontal_line(renderer, ctx, x1, y1, w, color);
    draw_horizontal_line(renderer, ctx, x1, y2, w, color);
    draw_vertical_line(renderer, ctx, x1, y1, h, color);
    draw_vertical_line(renderer, ctx, x2, y1, h, color);

    x1++;
    y1++;
    x2--;
    y2--;
  }
}

function draw_horizontal_line(
  renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  color: string
) {
  const { hline_canvas, hline_canvas_ctx } = renderer;

  const should_resize_canvas = hline_canvas.width < length;
  if (should_resize_canvas) {
    hline_canvas.width = length;
  }

  if (should_resize_canvas || color !== renderer.hline_color) {
    renderer.hline_color = color;

    hline_canvas_ctx.fillStyle = color;
    hline_canvas_ctx.fillRect(0, 0, hline_canvas.width, hline_canvas.height);
  }

  ctx.drawImage(renderer.hline_canvas, 0, 0, length, 1, x, y, length, 1);
}

function draw_vertical_line(
  renderer: Renderer,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  color: string
) {
  const { vline_canvas, vline_canvas_ctx } = renderer;

  const should_resize_canvas = vline_canvas.height < length;
  if (should_resize_canvas) {
    vline_canvas.height = length;
  }

  if (should_resize_canvas || color !== renderer.vline_color) {
    renderer.vline_color = color;

    vline_canvas_ctx.fillStyle = color;
    vline_canvas_ctx.fillRect(0, 0, vline_canvas.width, vline_canvas.height);
  }

  ctx.drawImage(renderer.vline_canvas, 0, 0, 1, length, x, y, 1, length);
}

function get_context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }
  return ctx;
}
