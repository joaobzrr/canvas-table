import Graphemer from "graphemer";
import { make_glyph_atlas, cache_glyph } from "./glyph_atlas";
import { get_context, is_whitespace, modf } from "./utils";
import { Renderer, Make_Renderer_Params, Draw_Command } from "./types";

export function make_renderer(params: Make_Renderer_Params): Renderer {
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

  const command_buffer: Draw_Command[] = [];

  return {
    canvas: params.canvas,
    ctx: params.ctx,
    glyph_atlas,
    hline_canvas,
    vline_canvas,
    hline_canvas_ctx,
    vline_canvas_ctx,
    hline_color,
    vline_color,
    command_buffer
  };
}

export function push_draw_command(renderer: Renderer, shape: Draw_Command) {
  renderer.command_buffer.unshift(shape);
}

export function render(renderer: Renderer) {
  const { canvas, ctx } = renderer;

  renderer.command_buffer.sort((a, b) => {
    const { sort_order: a_sort_order = 0 } = a;
    const { sort_order: b_sort_order = 0 } = b;
    return b_sort_order - a_sort_order;
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  while (renderer.command_buffer.length > 0) {
    const command = renderer.command_buffer.pop()!;

    if (command.clip_region) {
      ctx.save();
      ctx.clip(command.clip_region);
    }

    switch (command.type) {
      case "text": {
        const { text, x, y, font, color, max_width } = command;

        draw_text(renderer, ctx, text, x, y, font, color, max_width, true);
        break;
      }
      case "line": {
        const { x, y, length, color } = command;

        if (command.orientation === "horizontal") {
          draw_horizontal_line(renderer, ctx, x, y, length, color);
        } else {
          draw_vertical_line(renderer, ctx, x, y, length, color);
        }

        break;
      }
      case "rect": {
        const { x, y, width, height, fill_color, stroke_color, stroke_width } = command;

        if (fill_color) {
          fill_rect(renderer, ctx, x, y, width, height, fill_color);
        }

        if (stroke_color && stroke_width) {
          stroke_rect(renderer, ctx, x, y, width, height, stroke_color, stroke_width);
        }

        break;
      }
    }

    if (command.clip_region) {
      ctx.restore();
    }
  }
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
  const { glyph_atlas } = renderer;

  const ellipsis_enabled = ellipsis && max_width !== Infinity;

  let available_content_width: number;
  if (ellipsis_enabled) {
    const { advance: full_stop_advance } = cache_glyph(glyph_atlas, ".", font);
    available_content_width = Math.max(max_width - full_stop_advance * 3, 0);
  } else {
    available_content_width = max_width;
  }

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

    const subpixel_offset = modf(total_content_width);
    const { sx, sy, sw, sh, hshift, vshift, advance } = cache_glyph(
      glyph_atlas,
      grapheme,
      font,
      color,
      subpixel_offset
    );

    if (total_content_width + advance > available_content_width) {
      do_ellipsis = true;
      break;
    }

    const got_whitespace = is_whitespace(grapheme);
    if (!got_whitespace) {
      const dx = Math.floor(x + total_content_width - hshift);
      const dy = y - vshift;
      ctx.drawImage(glyph_atlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);
    }

    total_content_width += advance;
    if (!got_whitespace) {
      total_content_width_up_to_last_char_before_whitespace = total_content_width;
    }
  }

  if (ellipsis_enabled && do_ellipsis) {
    let total_content_width = total_content_width_up_to_last_char_before_whitespace;

    for (let i = 0; i < 3; i++) {
      const subpixel_offset = modf(total_content_width);
      const { sx, sy, sw, sh, hshift, vshift, advance } = cache_glyph(glyph_atlas,
        ".",
        font,
        color,
        subpixel_offset);


      if (total_content_width + advance > max_width) {
        break;
      }

      const dx = Math.floor(x + total_content_width - hshift);
      const dy = y - vshift;
      ctx.drawImage(glyph_atlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);

      total_content_width += advance;
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
