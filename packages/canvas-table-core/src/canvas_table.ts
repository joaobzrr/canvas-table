import { make_renderer, push_draw_command, render } from "./renderer";
import {
  create_id,
  is_active,
  is_hot,
  is_none_active,
  make_ui_context,
  set_as_active,
  set_as_hot,
  unset_as_hot,
  UI_ID,
  is_any_active
} from "./ui_context";
import { default_theme } from "./default_theme";
import {
  clamp,
  lerp,
  is_point_in_rect,
  create_font_specifier,
  get_font_metrics,
  is_number,
  shallow_merge
} from "./utils";
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  MIN_THUMB_LENGTH,
  MOUSE_BUTTONS,
  RENDER_LAYER_1,
  RENDER_LAYER_3
} from "./constants";
import {
  Canvas_Table,
  Table_Props,
  Create_Canvas_Table_Params,
  Column_Def,
  Data_Row,
  Data_Row_ID,
  Draggable_Props,
  Mouse_Button_Value,
  Prop_Value,
  Vector
} from "./types";

export function make_canvas_table(params: Create_Canvas_Table_Params): Canvas_Table {
  const { container, ...partial_props } = params;

  const container_el = document.getElementById(container);
  if (!container_el) {
    throw new Error(`Element with id "${container}" could not be found`);
  }
  container_el.replaceChildren();
  container_el.style.overflow = "hidden";

  const wrapper_el = document.createElement("div");
  wrapper_el.style.height = "100%";
  wrapper_el.classList.add("canvas-table-wrapper");
  container_el.appendChild(wrapper_el);

  const canvas = document.createElement("canvas");
  wrapper_el.appendChild(canvas);

  const theme = params.theme ?? default_theme;
  const selectId = params.selectId ?? default_id_selector;
  const selectProp = params.selectProp ?? default_prop_selector;
  const props = {
    ...partial_props,
    theme,
    selectId,
    selectProp
  };

  const renderer = make_renderer({ canvas });
  const ui = make_ui_context();

  const batched_props = [] as Partial<Table_Props>[];

  const ct = {
    container_el,
    wrapper_el,
    canvas,

    renderer,
    ui,

    curr_mouse_x: 0,
    curr_mouse_y: 0,
    curr_mouse_buttons: 0,
    prev_mouse_buttons: 0,
    drag_anchor_x: 0,
    drag_anchor_y: 0,
    drag_start_x: 0,
    drag_start_y: 0,
    drag_distance_x: 0,
    drag_distance_y: 0,
    scroll_amount_x: 0,
    scroll_amount_y: 0,

    props,
    batched_props,

    should_reflow: false,
    table_width: 1,
    table_height: 1,
    table_area_x: 0,
    table_area_y: 0,
    table_area_width: 1,
    table_area_height: 1,
    body_area_x: 0,
    body_area_y: 0,
    body_area_width: 1,
    body_area_height: 1,
    header_area_x: 0,
    header_area_y: 0,
    header_area_width: 1,
    header_area_height: 1,
    body_visible_width: 0,
    body_visible_height: 0,
    scroll_x: 0,
    scroll_y: 0,
    scroll_width: 1,
    scroll_height: 1,
    scroll_width_min_capped: 1,
    scroll_height_min_capped: 1,
    max_scroll_x: 0,
    max_scroll_y: 0,
    hsb_x: 0,
    hsb_y: 0,
    hsb_width: 1,
    hsb_height: 1,
    hsb_track_x: 0,
    hsb_track_y: 0,
    hsb_track_width: 1,
    hsb_track_height: 1,
    hsb_thumb_x: 0,
    hsb_thumb_y: 0,
    hsb_thumb_width: 1,
    hsb_thumb_height: 1,
    hsb_thumb_min_x: 0,
    hsb_thumb_max_x: 0,
    vsb_x: 0,
    vsb_y: 0,
    vsb_width: 1,
    vsb_height: 1,
    vsb_track_x: 0,
    vsb_track_y: 0,
    vsb_track_width: 1,
    vsb_track_height: 1,
    vsb_thumb_x: 0,
    vsb_thumb_y: 0,
    vsb_thumb_width: 1,
    vsb_thumb_height: 1,
    vsb_thumb_min_y: 0,
    vsb_thumb_max_y: 0,
    overflow_x: false,
    overflow_y: false,
    column_start: 0,
    column_end: 0,
    row_start: 0,
    row_end: 0,
    column_widths: calculate_column_widths(props.columnDefs),
    canonical_column_positions: [] as number[],
    selected_row_id: null
  } as Canvas_Table;

  ct.mouse_down_handler = (e) => on_mouse_down(ct, e);
  ct.mouse_up_handler = (e) => on_mouse_up(ct, e);
  ct.mouse_move_handler = (e) => on_mouse_move(ct, e);
  ct.wheel_handler = (e) => on_wheel(ct, e);
  ct.visibility_change_handler = () => on_visibility_change(ct);

  canvas.addEventListener("mousedown", ct.mouse_down_handler);
  canvas.addEventListener("wheel", ct.wheel_handler);
  document.addEventListener("mousemove", ct.mouse_move_handler);
  document.addEventListener("mouseup", ct.mouse_up_handler);
  document.addEventListener("visibilitychange", ct.visibility_change_handler);

  start_animation(ct);

  return ct;
}

export function config_canvas_table(ct: Canvas_Table, props: Partial<Table_Props>) {
  ct.batched_props.push(props);
}

export function destroy_canvas_table(ct: Canvas_Table) {
  stop_animation(ct);

  document.removeEventListener("mousemove", ct.mouse_move_handler);
  document.removeEventListener("mouseup", ct.mouse_up_handler);
  document.removeEventListener("visibilitychange", ct.visibility_change_handler);
}

function start_animation(ct: Canvas_Table) {
  if (ct.raf_id === undefined) {
    ct.raf_id = requestAnimationFrame(() => update(ct));
  }
}

function stop_animation(ct: Canvas_Table) {
  if (ct.raf_id !== undefined) {
    cancelAnimationFrame(ct.raf_id);
    ct.raf_id = undefined;
  }
}

function update(ct: Canvas_Table) {
  const { canvas, renderer, props } = ct;
  const { theme } = props;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }

  if (
    ct.container_el.offsetWidth !== canvas.width ||
    ct.container_el.offsetHeight !== canvas.height
  ) {
    canvas.width = ct.container_el.offsetWidth;
    canvas.height = ct.container_el.offsetHeight;
  }

  set_table_size(ct, canvas.width, canvas.height);

  const new_props = {};
  while (ct.batched_props.length > 0) {
    shallow_merge(new_props, ct.batched_props.shift());
  }
  update_props(ct, new_props);

  if (ct.should_reflow) {
    reflow(ct);
  }

  if (is_mouse_pressed(ct, MOUSE_BUTTONS.PRIMARY)) {
    ct.drag_start_x = ct.curr_mouse_x;
    ct.drag_start_y = ct.curr_mouse_y;
  }

  if (is_mouse_down(ct, MOUSE_BUTTONS.PRIMARY)) {
    ct.drag_distance_x = ct.curr_mouse_x - ct.drag_start_x;
    ct.drag_distance_y = ct.curr_mouse_y - ct.drag_start_y;
  }

  {
    let new_scroll_x = ct.scroll_x;
    let new_scroll_y = ct.scroll_y;

    if (is_none_active(ct.ui)) {
      new_scroll_x += ct.scroll_amount_x;
      new_scroll_y += ct.scroll_amount_y;
    }

    new_scroll_x = clamp(new_scroll_x, 0, ct.max_scroll_x);
    new_scroll_y = clamp(new_scroll_y, 0, ct.max_scroll_y);
    if (new_scroll_x !== ct.scroll_x || new_scroll_y !== ct.scroll_y) {
      scroll_table_to(ct, new_scroll_x, new_scroll_y);
    }
  }

  let mouse_row = -1;
  {
    const mouse_is_in_body = is_point_in_rect(
      ct.curr_mouse_x,
      ct.curr_mouse_y,
      ct.body_area_x,
      ct.body_area_y,
      ct.body_visible_width,
      ct.body_visible_height
    );
    if (mouse_is_in_body) {
      mouse_row = Math.floor(
        (screen_to_scroll_y(ct, ct.curr_mouse_y) - theme.rowHeight) / theme.rowHeight
      );
    }
  }

  if (theme.tableBackgroundColor) {
    push_draw_command(renderer, {
      type: "rect",
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      fill_color: theme.tableBackgroundColor
    });
  }

  if (theme.bodyBackgroundColor) {
    push_draw_command(renderer, {
      type: "rect",
      fill_color: theme.bodyBackgroundColor,
      x: ct.body_area_x,
      y: ct.body_area_y,
      width: ct.body_area_width,
      height: ct.body_area_height
    });
  }

  if (theme.headerBackgroundColor) {
    push_draw_command(renderer, {
      type: "rect",
      fill_color: theme.headerBackgroundColor,
      x: ct.header_area_x,
      y: ct.header_area_y,
      width: ct.header_area_width,
      height: ct.header_area_height
    });
  }

  do_column_resizer(ct);

  if (ct.overflow_x) {
    if (theme.scrollbarTrackColor) {
      push_draw_command(renderer, {
        type: "rect",
        x: ct.hsb_x,
        y: ct.hsb_y,
        width: ct.hsb_width,
        height: ct.hsb_height,
        fill_color: theme.scrollbarTrackColor
      });
    }

    do_draggable(ct, {
      id: create_id("horizontal-scrollbar-thumb"),
      x: ct.hsb_thumb_x,
      y: ct.hsb_thumb_y,
      width: ct.hsb_thumb_width,
      height: ct.hsb_thumb_height,
      onDrag: (_id, pos) => on_drag_horizontal_scrollbar(ct, pos),
      activeColor: theme.scrollbarThumbPressedColor,
      hotColor: theme.scrollbarThumbHoverColor,
      color: theme.scrollbarThumbColor,
      sortOrder: RENDER_LAYER_3
    });
  }

  if (ct.overflow_y) {
    if (theme.scrollbarTrackColor) {
      push_draw_command(renderer, {
        type: "rect",
        x: ct.vsb_x,
        y: ct.vsb_y,
        width: ct.vsb_width,
        height: ct.vsb_height,
        fill_color: theme.scrollbarTrackColor
      });
    }

    do_draggable(ct, {
      id: create_id("vertical-scrollbar-thumb"),
      x: ct.vsb_thumb_x,
      y: ct.vsb_thumb_y,
      width: ct.vsb_thumb_width,
      height: ct.vsb_thumb_height,
      onDrag: (_id, pos) => on_drag_vertical_scrollbar(ct, pos),
      activeColor: theme.scrollbarThumbPressedColor,
      hotColor: theme.scrollbarThumbHoverColor,
      color: theme.scrollbarThumbColor,
      sortOrder: RENDER_LAYER_3
    });
  }

  if (mouse_row !== -1) {
    const data_row = props.dataRows[mouse_row];
    if (is_mouse_pressed(ct, MOUSE_BUTTONS.PRIMARY)) {
      const data_row_id = props.selectId(data_row);
      if (data_row_id !== ct.selected_row_id) {
        ct.selected_row_id = data_row_id;
        props.onSelectRow?.(data_row_id, data_row);
      }
    }

    if (!is_any_active(ct.ui) && theme.hoveredRowColor) {
      const row_rect = calculate_row_rect(ct, mouse_row);

      const clip_region = make_body_area_clip_region(ct);

      push_draw_command(renderer, {
        type: "rect",
        fill_color: theme.hoveredRowColor,
        clip_region,
        ...row_rect
      });
    }
  }

  if (ct.selected_row_id !== null) {
    const clip_region = make_body_area_clip_region(ct);

    for (const rowIndex of table_row_range(ct)) {
      const data_row = props.dataRows[rowIndex];
      const data_row_id = props.selectId(data_row);

      if (ct.selected_row_id === data_row_id) {
        const rect = calculate_row_rect(ct, rowIndex);

        push_draw_command(renderer, {
          type: "rect",
          fill_color: theme.selectedRowColor,
          clip_region,
          ...rect
        });

        break;
      }
    }
  }

  // Draw outer canvas border
  push_draw_command(renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: 0,
    length: canvas.width,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  push_draw_command(renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: canvas.height - 1,
    length: canvas.width,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  push_draw_command(renderer, {
    type: "line",
    orientation: "vertical",
    x: 0,
    y: 0,
    length: canvas.height,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  push_draw_command(renderer, {
    type: "line",
    orientation: "vertical",
    x: canvas.width - 1,
    y: 0,
    length: canvas.height,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  const grid_width = ct.body_visible_width;
  const grid_height = ct.body_visible_height + theme.rowHeight;

  // Draw header bottom border
  push_draw_command(renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: theme.rowHeight,
    length: canvas.width,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  // If horizontal scrollbar is visible, draw its border, otherwise,
  // draw table content right border
  if (ct.overflow_x) {
    push_draw_command(renderer, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: ct.hsb_y - 1,
      length: canvas.width,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  } else {
    push_draw_command(renderer, {
      type: "line",
      orientation: "vertical",
      x: grid_width,
      y: 0,
      length: grid_height,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  }

  // If vertical scrollbar is visible, draw its border, otherwise,
  // draw table content bottom border
  if (ct.overflow_y) {
    push_draw_command(renderer, {
      type: "line",
      orientation: "vertical",
      x: ct.vsb_x - 1,
      y: 0,
      length: canvas.height,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  } else {
    push_draw_command(renderer, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: grid_height,
      length: grid_width,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  }

  // Draw grid horizontal lines
  for (const rowIndex of table_row_range(ct, 1)) {
    push_draw_command(renderer, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: row_screen_y(ct, rowIndex),
      length: grid_width,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  }

  // Draw grid vertical lines
  for (const columnIndex of table_column_range(ct, 1)) {
    push_draw_command(renderer, {
      type: "line",
      orientation: "vertical",
      x: column_screen_x(ct, columnIndex),
      y: 0,
      length: grid_height,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  }

  {
    const actual_font_stye = theme.headerFontStyle ?? theme.fontStyle;
    const font = create_font_specifier(theme.fontFamily, theme.fontSize, actual_font_stye);

    const { fontBoundingBoxAscent } = get_font_metrics(ctx, font);
    const half_font_bounding_box_ascent = Math.floor(fontBoundingBoxAscent / 2);

    const actual_font_color = theme.headerFontColor ?? theme.fontColor;

    const clip_region = make_header_area_clip_region(ct);

    for (const column_index of table_column_range(ct)) {
      const column_def = props.columnDefs[column_index];
      const column_width = ct.column_widths[column_index];

      const column_pos = column_screen_x(ct, column_index);

      const x = column_pos + theme.cellPadding;
      const y = theme.rowHeight / 2 + half_font_bounding_box_ascent;
      const max_width = column_width - theme.cellPadding * 2;
      const text = column_def.title;

      push_draw_command(renderer, {
        type: "text",
        x,
        y,
        color: actual_font_color,
        text,
        font,
        max_width,
        clip_region
      });
    }
  }

  {
    const actual_font_style = theme.bodyFontStyle ?? theme.fontStyle;
    const font = create_font_specifier(theme.fontFamily, theme.fontSize, actual_font_style);

    const { fontBoundingBoxAscent } = get_font_metrics(ctx, font);
    const half_font_bounding_box_ascent = Math.floor(fontBoundingBoxAscent / 2);

    const actual_font_color = theme.bodyFontColor ?? theme.fontColor;

    const clip_region = make_body_area_clip_region(ct);

    for (const column_index of table_column_range(ct)) {
      const column_def = props.columnDefs[column_index];
      const column_width = ct.column_widths[column_index];

      const column_pos = column_screen_x(ct, column_index);

      const x = column_pos + theme.cellPadding;
      const max_width = column_width - theme.cellPadding * 2;

      for (const row_index of table_row_range(ct)) {
        const data_row = props.dataRows[row_index];

        const row_pos = row_screen_y(ct, row_index);

        const y = row_pos + theme.rowHeight / 2 + half_font_bounding_box_ascent;

        const value = props.selectProp(data_row, column_def);
        const text = is_number(value) ? value.toString() : (value as string);

        push_draw_command(renderer, {
          type: "text",
          x,
          y,
          color: actual_font_color,
          text,
          font,
          max_width,
          clip_region
        });
      }
    }
  }

  render(renderer);

  ct.prev_mouse_buttons = ct.curr_mouse_buttons;
  ct.scroll_amount_x = 0;
  ct.scroll_amount_y = 0;

  ct.raf_id = requestAnimationFrame(() => update(ct));
}

function update_props(ct: Canvas_Table, props: Partial<Table_Props>) {
  const { columnDefs, dataRows, theme, ...rest } = props;

  let should_reflow = false;

  if (columnDefs && !Object.is(columnDefs, ct.props.columnDefs)) {
    ct.props.columnDefs = columnDefs;
    ct.column_widths = calculate_column_widths(columnDefs);
    should_reflow = true;
  }

  if (dataRows && !Object.is(dataRows, ct.props.dataRows)) {
    ct.props.dataRows = dataRows;
    should_reflow = true;
  }

  if (theme && !Object.is(theme, ct.props.theme)) {
    ct.props.theme = theme;
    should_reflow = true;
  }

  ct.should_reflow ||= should_reflow;

  shallow_merge(ct.props, rest);
}

export function set_table_size(ct: Canvas_Table, width: number, height: number) {
  const should_reflow = ct.table_width !== width || ct.table_height !== height;
  ct.table_width = width;
  ct.table_height = height;
  ct.should_reflow ||= should_reflow;
}

export function reflow(ct: Canvas_Table) {
  recalculate_layout_state(ct);
  recalculate_scrollbar_thumb_positions(ct);
  recalculate_viewport_state(ct);

  ct.should_reflow = false;
}

export function resize_table_column(ct: Canvas_Table, column_index: number, column_width: number) {
  const { column_widths } = ct;
  column_widths[column_index] = column_width;

  recalculate_layout_state(ct);

  ct.scroll_x = Math.min(ct.scroll_x, ct.max_scroll_x);
  ct.scroll_y = Math.min(ct.scroll_y, ct.max_scroll_y);
  recalculate_scrollbar_thumb_positions(ct);
  recalculate_viewport_state(ct);

  const column_def = ct.props.columnDefs[column_index];
  ct.props.onResizeColumn?.(column_def.key, column_width);
}

export function scroll_table_to(ct: Canvas_Table, scroll_x: number, scroll_y: number) {
  ct.scroll_x = scroll_x;
  ct.scroll_y = scroll_y;
  recalculate_scrollbar_thumb_positions(ct);
  recalculate_viewport_state(ct);
}

export function* table_column_range(ct: Canvas_Table, start = 0) {
  for (let j = ct.column_start + start; j < ct.column_end; j++) {
    yield j;
  }
}

export function* table_row_range(ct: Canvas_Table, start = 0) {
  for (let i = ct.row_start + start; i < ct.row_end; i++) {
    yield i;
  }
}

export function column_scroll_x(ct: Canvas_Table, column_index: number) {
  return ct.canonical_column_positions[column_index];
}

export function row_scroll_y(ct: Canvas_Table, row_index: number) {
  return row_index * ct.props.theme.rowHeight;
}

export function column_screen_x(ct: Canvas_Table, column_index: number) {
  const canonical_pos = column_scroll_x(ct, column_index);
  const screen_column_x = scroll_to_screen_x(ct, canonical_pos);
  return screen_column_x;
}

export function row_screen_y(ct: Canvas_Table, row_index: number) {
  const canonical_pos = row_scroll_y(ct, row_index);
  const screen_row_y = scroll_to_screen_y(ct, canonical_pos) + ct.props.theme.rowHeight;
  return screen_row_y;
}

export function scroll_to_screen_x(ct: Canvas_Table, canonical_x: number) {
  return canonical_x - ct.scroll_x;
}

export function scroll_to_screen_y(ct: Canvas_Table, canonical_y: number) {
  return canonical_y - ct.scroll_y;
}

export function screen_to_scroll_x(ct: Canvas_Table, screen_x: number) {
  return screen_x + ct.scroll_x;
}

export function screen_to_scroll_y(ct: Canvas_Table, screen_y: number) {
  return screen_y + ct.scroll_y;
}

export function make_body_area_clip_region(ct: Canvas_Table) {
  const body_clip_region = new Path2D();
  body_clip_region.rect(ct.body_area_x, ct.body_area_y, ct.body_area_width, ct.body_area_height);
  return body_clip_region;
}

export function make_header_area_clip_region(ct: Canvas_Table) {
  const header_area_region = new Path2D();
  header_area_region.rect(
    ct.header_area_x,
    ct.header_area_y,
    ct.header_area_width,
    ct.header_area_height
  );
  return header_area_region;
}

function recalculate_layout_state(ct: Canvas_Table) {
  let scroll_width = 0;
  for (const width of ct.column_widths) {
    scroll_width += width;
  }

  ct.scroll_width = scroll_width;
  ct.scroll_height = ct.props.dataRows.length * ct.props.theme.rowHeight;

  const table_area_outer_width = ct.table_width - BORDER_WIDTH;
  const table_area_outer_height = ct.table_height - BORDER_WIDTH;

  const table_area_inner_width =
    table_area_outer_width - ct.props.theme.scrollbarThickness - BORDER_WIDTH;
  const table_area_inner_height =
    table_area_outer_height - ct.props.theme.scrollbarThickness - BORDER_WIDTH;

  const body_area_outer_height = table_area_outer_height - ct.props.theme.rowHeight;
  const body_area_inner_height = table_area_inner_height - ct.props.theme.rowHeight;

  if (table_area_outer_width >= ct.scroll_width && body_area_outer_height >= ct.scroll_height) {
    ct.overflow_x = ct.overflow_y = false;
  } else {
    ct.overflow_x = table_area_inner_width < ct.scroll_width;
    ct.overflow_y = body_area_inner_height < ct.scroll_height;
  }

  let table_area_width: number;
  let body_area_width: number;

  if (ct.overflow_y) {
    table_area_width = body_area_width = table_area_inner_width;
  } else {
    table_area_width = body_area_width = table_area_outer_width;
  }

  let table_area_height: number;
  let body_area_height: number;
  if (ct.overflow_x) {
    table_area_height = table_area_inner_height;
    body_area_height = body_area_inner_height;
  } else {
    table_area_height = table_area_outer_height;
    body_area_height = body_area_outer_height;
  }

  ct.table_area_x = 0;
  ct.table_area_y = 0;
  ct.table_area_width = table_area_width;
  ct.table_area_height = table_area_height;

  ct.body_area_x = 0;
  ct.body_area_y = ct.props.theme.rowHeight;
  ct.body_area_width = body_area_width;
  ct.body_area_height = body_area_height;

  ct.header_area_x = 0;
  ct.header_area_y = 0;
  ct.header_area_width = table_area_width;
  ct.header_area_height = ct.props.theme.rowHeight;

  ct.scroll_width_min_capped = Math.max(ct.scroll_width, body_area_width);
  ct.scroll_height_min_capped = Math.max(ct.scroll_height, body_area_height);

  ct.max_scroll_x = ct.scroll_width_min_capped - body_area_width;
  ct.max_scroll_y = ct.scroll_height_min_capped - body_area_height;

  ct.body_visible_width = Math.min(ct.body_area_width, ct.scroll_width);
  ct.body_visible_height = Math.min(ct.body_area_height, ct.scroll_height);

  ct.hsb_x = BORDER_WIDTH;
  ct.hsb_y = table_area_height + BORDER_WIDTH;
  ct.hsb_width = table_area_width - BORDER_WIDTH;
  ct.hsb_height = ct.props.theme.scrollbarThickness;

  ct.hsb_track_x = ct.hsb_x + ct.props.theme.scrollbarTrackMargin;
  ct.hsb_track_y = ct.hsb_y + ct.props.theme.scrollbarTrackMargin;
  ct.hsb_track_width = ct.hsb_width - ct.props.theme.scrollbarTrackMargin * 2;
  ct.hsb_track_height = ct.hsb_height - ct.props.theme.scrollbarTrackMargin * 2;

  ct.hsb_thumb_y = ct.hsb_track_y;
  ct.hsb_thumb_height = ct.hsb_track_height;
  ct.hsb_thumb_width = Math.max(
    (body_area_width / ct.scroll_width_min_capped) * ct.hsb_track_width,
    MIN_THUMB_LENGTH
  );
  ct.hsb_thumb_min_x = ct.hsb_track_x;
  ct.hsb_thumb_max_x = ct.hsb_track_x + ct.hsb_track_width - ct.hsb_thumb_width;

  ct.vsb_x = table_area_width + BORDER_WIDTH;
  ct.vsb_y = ct.props.theme.rowHeight + BORDER_WIDTH;
  ct.vsb_width = ct.props.theme.scrollbarThickness;
  ct.vsb_height = body_area_height - BORDER_WIDTH;

  ct.vsb_track_x = ct.vsb_x + ct.props.theme.scrollbarTrackMargin;
  ct.vsb_track_y = ct.vsb_y + ct.props.theme.scrollbarTrackMargin;
  ct.vsb_track_width = ct.vsb_width - ct.props.theme.scrollbarTrackMargin * 2;
  ct.vsb_track_height = ct.vsb_height - ct.props.theme.scrollbarTrackMargin * 2;

  ct.vsb_thumb_x = ct.vsb_track_x;
  ct.vsb_thumb_width = ct.vsb_track_width;
  ct.vsb_thumb_height = Math.max(
    (body_area_height / ct.scroll_height_min_capped) * ct.vsb_track_height,
    MIN_THUMB_LENGTH
  );
  ct.vsb_thumb_min_y = ct.vsb_track_y;
  ct.vsb_thumb_max_y = ct.vsb_track_y + ct.vsb_track_height - ct.vsb_thumb_height;
}

function recalculate_viewport_state(ct: Canvas_Table) {
  let column_pos = 0;
  ct.canonical_column_positions = [];

  for (ct.column_start = 0; ct.column_start < ct.column_widths.length; ct.column_start++) {
    const column_width = ct.column_widths[ct.column_start];
    const next_column_pos = column_pos + column_width;
    if (next_column_pos > ct.scroll_x) {
      break;
    }
    ct.canonical_column_positions.push(column_pos);
    column_pos = next_column_pos;
  }

  const scroll_right = ct.scroll_x + ct.body_area_width;

  for (ct.column_end = ct.column_start; ct.column_end < ct.column_widths.length; ct.column_end++) {
    if (column_pos >= scroll_right) {
      break;
    }
    ct.canonical_column_positions.push(column_pos);
    column_pos += ct.column_widths[ct.column_end];
  }

  ct.row_start = Math.floor(ct.scroll_y / ct.props.theme.rowHeight);

  const scroll_bottom = ct.scroll_y + ct.body_area_height;
  ct.row_end = Math.min(
    Math.ceil(scroll_bottom / ct.props.theme.rowHeight),
    ct.props.dataRows.length
  );
}

function recalculate_scrollbar_thumb_positions(ct: Canvas_Table) {
  ct.hsb_thumb_x = lerp(ct.scroll_x, 0, ct.max_scroll_x, ct.hsb_thumb_min_x, ct.hsb_thumb_max_x);
  ct.vsb_thumb_y = lerp(ct.scroll_y, 0, ct.max_scroll_y, ct.vsb_thumb_min_y, ct.vsb_thumb_max_y);
}

function calculate_column_widths(column_defs: Column_Def[]) {
  const column_widths = [];
  for (const { width } of column_defs) {
    column_widths.push(width ?? DEFAULT_COLUMN_WIDTH);
  }
  return column_widths;
}

function calculate_row_rect(ct: Canvas_Table, rowIndex: number) {
  const { theme } = ct.props;

  const row_pos = row_screen_y(ct, rowIndex);

  return {
    x: 0,
    y: row_pos,
    width: ct.body_visible_width,
    height: theme.rowHeight
  };
}

function do_column_resizer(ct: Canvas_Table) {
  const clip_region = make_header_area_clip_region(ct);

  if (is_active(ct.ui, "column-resizer")) {
    do_one_column_resizer(ct, ct.ui.active!, clip_region);
    return;
  }

  for (const column_index of table_column_range(ct)) {
    const id = create_id("column-resizer", column_index);
    do_one_column_resizer(ct, id, clip_region);
  }
}

function do_one_column_resizer(ct: Canvas_Table, id: UI_ID, clip_region: Path2D) {
  const { theme } = ct.props;

  const column_index = id.index!;
  const rect = calculate_column_resizer_rect(ct, column_index);

  do_draggable(ct, {
    id,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    onDrag: (id, pos) => on_drag_column_resizer(ct, id, pos),
    activeColor: theme.columnResizerColor,
    hotColor: theme.columnResizerColor,
    sortOrder: RENDER_LAYER_3,
    clipRegion: clip_region
  });
}

function on_drag_column_resizer(ct: Canvas_Table, id: UI_ID, pos: Vector) {
  pos.y = 1;

  const column_index = id.index!;
  const column_pos = column_screen_x(ct, column_index);
  const calculated_column_width = pos.x - column_pos + COLUMN_RESIZER_LEFT_WIDTH;
  const column_width = Math.max(calculated_column_width, MIN_COLUMN_WIDTH);

  resize_table_column(ct, column_index, column_width);

  const rect = calculate_column_resizer_rect(ct, column_index);
  pos.x = rect.x;
}

function calculate_column_resizer_rect(ct: Canvas_Table, column_index: number) {
  const { theme } = ct.props;

  const column_width = ct.column_widths[column_index];

  const canonical_column_left = column_scroll_x(ct, column_index);
  const screen_column_left = canonical_column_left - ct.scroll_x;
  const screen_column_right = screen_column_left + column_width;

  const screen_scroll_end = scroll_to_screen_x(ct, ct.scroll_width_min_capped);

  const calculated_resizer_right = screen_column_right + COLUMN_RESIZER_LEFT_WIDTH + 1;
  const resizer_right = Math.min(calculated_resizer_right, screen_scroll_end);
  const resizer_left = resizer_right - COLUMN_RESIZER_WIDTH;

  const rect = {
    x: resizer_left,
    y: 1,
    width: COLUMN_RESIZER_WIDTH,
    height: theme.rowHeight - 1
  };

  return rect;
}

function on_drag_horizontal_scrollbar(ct: Canvas_Table, pos: Vector) {
  const hsb_thumb_x = clamp(pos.x, ct.hsb_thumb_min_x, ct.hsb_thumb_max_x);
  pos.x = hsb_thumb_x;
  pos.y = ct.hsb_track_y;

  const new_scroll_x = Math.round(
    lerp(hsb_thumb_x, ct.hsb_thumb_min_x, ct.hsb_thumb_max_x, 0, ct.max_scroll_x)
  );
  scroll_table_to(ct, new_scroll_x, ct.scroll_y);
}

function on_drag_vertical_scrollbar(ct: Canvas_Table, pos: Vector) {
  const vsb_thumb_y = clamp(pos.y, ct.vsb_thumb_min_y, ct.vsb_thumb_max_y);
  pos.y = vsb_thumb_y;
  pos.x = ct.vsb_track_x;

  const new_scroll_y = Math.round(
    lerp(vsb_thumb_y, ct.vsb_thumb_min_y, ct.vsb_thumb_max_y, 0, ct.max_scroll_y)
  );
  scroll_table_to(ct, ct.scroll_x, new_scroll_y);
}

function do_draggable(ct: Canvas_Table, props: Draggable_Props) {
  if (is_active(ct.ui, props.id)) {
    if (is_mouse_released(ct, MOUSE_BUTTONS.PRIMARY)) {
      // @Todo Move this to a separate function
      // @Note What is the purpose of this?
      if (ct.ui.active && ct.ui.active.name === props.id.name) {
        ct.ui.active = null;
      }
    } else {
      const pos = {
        x: ct.drag_anchor_x + ct.drag_distance_x,
        y: ct.drag_anchor_y + ct.drag_distance_y
      };

      if (props.onDrag) {
        props.onDrag(props.id, pos);
      }

      props.x = pos.x;
      props.y = pos.y;
    }
  } else if (is_hot(ct.ui, props.id)) {
    if (is_mouse_pressed(ct, MOUSE_BUTTONS.PRIMARY)) {
      set_as_active(ct.ui, props.id);

      ct.drag_anchor_x = props.x;
      ct.drag_anchor_y = props.y;
    }
  }
  const inside = is_point_in_rect(
    ct.curr_mouse_x,
    ct.curr_mouse_y,
    props.x,
    props.y,
    props.width,
    props.height
  );
  if (inside) {
    set_as_hot(ct.ui, props.id);
  } else {
    unset_as_hot(ct.ui, props.id);
  }

  let fill_color: string | undefined;
  if (is_active(ct.ui, props.id)) {
    fill_color = props.activeColor;
  } else if (is_hot(ct.ui, props.id)) {
    fill_color = props.hotColor;
  } else {
    fill_color = props.color;
  }

  if (!fill_color) {
    return;
  }

  push_draw_command(ct.renderer, {
    type: "rect",
    fill_color,
    sort_order: props.sortOrder,
    clip_region: props.clipRegion,
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height
  });
}

function default_id_selector(row: Data_Row) {
  return row.id as Data_Row_ID;
}

function default_prop_selector(row: Data_Row, column_def: Column_Def) {
  return row[column_def.key] as Prop_Value;
}

// ---------- GUI STUFF ----------

function is_mouse_down(ct: Canvas_Table, button: Mouse_Button_Value) {
  const value = normalized_to_buttons_value(button);
  return ct.curr_mouse_buttons & value;
}

function is_mouse_pressed(ct: Canvas_Table, button: Mouse_Button_Value) {
  const value = normalized_to_buttons_value(button);
  return (ct.curr_mouse_buttons & value) === 1 && (ct.prev_mouse_buttons & value) === 0;
}

function is_mouse_released(ct: Canvas_Table, button: Mouse_Button_Value) {
  const value = normalized_to_buttons_value(button);
  return (ct.curr_mouse_buttons & value) === 0 && (ct.prev_mouse_buttons & value) === 1;
}

function update_mouse_state(ct: Canvas_Table, event: MouseEvent) {
  const bcr = ct.wrapper_el.getBoundingClientRect();
  ct.curr_mouse_x = event.clientX - bcr.x;
  ct.curr_mouse_y = event.clientY - bcr.y;
  ct.curr_mouse_buttons = event.buttons;
}

function normalized_to_buttons_value(value: Mouse_Button_Value): number {
  switch (value) {
    case MOUSE_BUTTONS.PRIMARY:
      return 1;
    case MOUSE_BUTTONS.SECONDARY:
      return 2;
    case MOUSE_BUTTONS.AUXILIARY:
      return 4;
    case MOUSE_BUTTONS.FOURTH:
      return 8;
    case MOUSE_BUTTONS.FIFTH:
      return 16;
  }
}

function on_mouse_down(ct: Canvas_Table, event: MouseEvent) {
  event.preventDefault();
  update_mouse_state(ct, event);
}

function on_mouse_up(ct: Canvas_Table, event: MouseEvent) {
  update_mouse_state(ct, event);
}

function on_mouse_move(ct: Canvas_Table, event: MouseEvent) {
  update_mouse_state(ct, event);
}

function on_wheel(ct: Canvas_Table, event: WheelEvent) {
  ct.scroll_amount_x = event.deltaX;
  ct.scroll_amount_y = event.deltaY;
}

function on_visibility_change(ct: Canvas_Table) {
  if (document.hidden) {
    stop_animation(ct);
  } else {
    start_animation(ct);
  }
}
