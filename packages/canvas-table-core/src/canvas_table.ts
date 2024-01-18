import {
  column_scroll_x,
  scroll_to_screen_x,
  make_body_area_clip_region,
  make_header_area_clip_region,
  reflow,
  resize_table_column,
  column_screen_x,
  row_screen_y,
  screen_to_scroll_y,
  scroll_table_to,
  set_table_size,
  table_column_range,
  table_row_range,
  update_props
} from "./table_state";
import { make_renderer, renderer_submit, renderer_render } from "./renderer";
import { make_table_context } from "./table_context";
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
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  MIN_COLUMN_WIDTH,
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

  const tblctx = make_table_context(canvas, props);
  const renderer = make_renderer();
  const ui = make_ui_context();

  const batched_props = [] as Partial<Table_Props>[];

  const ct = {
    tblctx,
    renderer,
    ui,
    container_el,
    wrapper_el,
    canvas,
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
    batched_props
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
  const { state } = ct.tblctx;
  const { props } = state;
  const { theme } = props;

  const ctx = ct.canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }

  if (
    ct.container_el.offsetWidth !== ct.canvas.width ||
    ct.container_el.offsetHeight !== ct.canvas.height
  ) {
    ct.canvas.width = ct.container_el.offsetWidth;
    ct.canvas.height = ct.container_el.offsetHeight;
  }

  set_table_size(state, ct.canvas.width, ct.canvas.height);

  const new_props = {};
  for (const props of ct.batched_props) {
    shallow_merge(new_props, props);
  }
  update_props(state, new_props);

  if (state.should_reflow) {
    reflow(state);
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
    let new_scroll_x = state.scroll_x;
    let new_scroll_y = state.scroll_y;

    if (is_none_active(ct.ui)) {
      new_scroll_x += ct.scroll_amount_x;
      new_scroll_y += ct.scroll_amount_y;
    }

    new_scroll_x = clamp(new_scroll_x, 0, state.max_scroll_x);
    new_scroll_y = clamp(new_scroll_y, 0, state.max_scroll_y);
    if (new_scroll_x !== state.scroll_x || new_scroll_y !== state.scroll_y) {
      scroll_table_to(state, new_scroll_x, new_scroll_y);
    }
  }

  let mouse_row = -1;
  {
    const mouse_is_in_body = is_point_in_rect(
      ct.curr_mouse_x,
      ct.curr_mouse_y,
      state.body_area_x,
      state.body_area_y,
      state.body_visible_width,
      state.body_visible_height
    );
    if (mouse_is_in_body) {
      mouse_row = Math.floor(
        (screen_to_scroll_y(state, ct.curr_mouse_y) - theme.rowHeight) / theme.rowHeight
      );
    }
  }

  if (theme.tableBackgroundColor) {
    renderer_submit(ct.renderer, {
      type: "rect",
      x: 0,
      y: 0,
      width: ct.canvas.width,
      height: ct.canvas.height,
      fill_color: theme.tableBackgroundColor
    });
  }

  if (theme.bodyBackgroundColor) {
    renderer_submit(ct.renderer, {
      type: "rect",
      fill_color: theme.bodyBackgroundColor,
      x: state.body_area_x,
      y: state.body_area_y,
      width: state.body_area_width,
      height: state.body_area_height
    });
  }

  if (theme.headerBackgroundColor) {
    renderer_submit(ct.renderer, {
      type: "rect",
      fill_color: theme.headerBackgroundColor,
      x: state.header_area_x,
      y: state.header_area_y,
      width: state.header_area_height,
      height: state.header_area_height
    });
  }

  do_column_resizer(ct);

  if (state.overflow_x) {
    if (theme.scrollbarTrackColor) {
      renderer_submit(ct.renderer, {
        type: "rect",
        x: state.hsb_x,
        y: state.hsb_y,
        width: state.hsb_width,
        height: state.hsb_height,
        fill_color: theme.scrollbarTrackColor
      });
    }

    do_draggable(ct, {
      id: create_id("horizontal-scrollbar-thumb"),
      x: state.hsb_thumb_x,
      y: state.hsb_thumb_y,
      width: state.hsb_thumb_width,
      height: state.hsb_thumb_height,
      onDrag: (_id, pos) => on_drag_horizontal_scrollbar(ct, pos),
      activeColor: theme.scrollbarThumbPressedColor,
      hotColor: theme.scrollbarThumbHoverColor,
      color: theme.scrollbarThumbColor,
      sortOrder: RENDER_LAYER_3
    });
  }

  if (state.overflow_y) {
    if (theme.scrollbarTrackColor) {
      renderer_submit(ct.renderer, {
        type: "rect",
        x: state.vsb_x,
        y: state.vsb_y,
        width: state.vsb_width,
        height: state.vsb_height,
        fill_color: theme.scrollbarTrackColor
      });
    }

    do_draggable(ct, {
      id: create_id("vertical-scrollbar-thumb"),
      x: state.vsb_thumb_x,
      y: state.vsb_thumb_y,
      width: state.vsb_thumb_width,
      height: state.vsb_thumb_height,
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
      if (data_row_id !== state.selected_row_id) {
        state.selected_row_id = data_row_id;
        props.onSelectRow?.(data_row_id, data_row);
      }
    }

    if (!is_any_active(ct.ui) && theme.hoveredRowColor) {
      const row_rect = calculate_row_rect(ct, mouse_row);

      const clip_region = make_body_area_clip_region(state);

      renderer_submit(ct.renderer, {
        type: "rect",
        fill_color: theme.hoveredRowColor,
        clip_region,
        ...row_rect
      });
    }
  }

  if (state.selected_row_id !== null) {
    const clip_region = make_body_area_clip_region(state);

    for (const rowIndex of table_row_range(state)) {
      const data_row = props.dataRows[rowIndex];
      const data_row_id = props.selectId(data_row);

      if (state.selected_row_id === data_row_id) {
        const rect = calculate_row_rect(ct, rowIndex);

        renderer_submit(ct.renderer, {
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
  renderer_submit(ct.renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: 0,
    length: ct.canvas.width,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  renderer_submit(ct.renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: ct.canvas.height - 1,
    length: ct.canvas.width,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  renderer_submit(ct.renderer, {
    type: "line",
    orientation: "vertical",
    x: 0,
    y: 0,
    length: ct.canvas.height,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  renderer_submit(ct.renderer, {
    type: "line",
    orientation: "vertical",
    x: ct.canvas.width - 1,
    y: 0,
    length: ct.canvas.height,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  const grid_width = state.body_visible_width;
  const grid_height = state.body_visible_height + theme.rowHeight;

  // Draw header bottom border
  renderer_submit(ct.renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: theme.rowHeight,
    length: ct.canvas.width,
    color: theme.tableBorderColor,
    sort_order: RENDER_LAYER_1
  });

  // If horizontal scrollbar is visible, draw its border, otherwise,
  // draw table content right border
  if (state.overflow_x) {
    renderer_submit(ct.renderer, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: state.hsb_y - 1,
      length: ct.canvas.width,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  } else {
    renderer_submit(ct.renderer, {
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
  if (state.overflow_y) {
    renderer_submit(ct.renderer, {
      type: "line",
      orientation: "vertical",
      x: state.vsb_x - 1,
      y: 0,
      length: ct.canvas.height,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  } else {
    renderer_submit(ct.renderer, {
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
  for (const rowIndex of table_row_range(state, 1)) {
    renderer_submit(ct.renderer, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: row_screen_y(state, rowIndex),
      length: grid_width,
      color: theme.tableBorderColor,
      sort_order: RENDER_LAYER_1
    });
  }

  // Draw grid vertical lines
  for (const columnIndex of table_column_range(state, 1)) {
    renderer_submit(ct.renderer, {
      type: "line",
      orientation: "vertical",
      x: column_screen_x(state, columnIndex),
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

    const clip_region = make_header_area_clip_region(state);

    for (const column_index of table_column_range(state)) {
      const column_def = props.columnDefs[column_index];
      const column_width = state.column_widths[column_index];

      const column_pos = column_screen_x(state, column_index);

      const x = column_pos + theme.cellPadding;
      const y = theme.rowHeight / 2 + half_font_bounding_box_ascent;
      const max_width = column_width - theme.cellPadding * 2;
      const text = column_def.title;

      renderer_submit(ct.renderer, {
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

    const clip_region = make_body_area_clip_region(state);

    for (const column_index of table_column_range(state)) {
      const column_def = props.columnDefs[column_index];
      const column_width = state.column_widths[column_index];

      const column_pos = column_screen_x(state, column_index);

      const x = column_pos + theme.cellPadding;
      const max_width = column_width - theme.cellPadding * 2;

      for (const row_index of table_row_range(state)) {
        const data_row = props.dataRows[row_index];

        const row_pos = row_screen_y(state, row_index);

        const y = row_pos + theme.rowHeight / 2 + half_font_bounding_box_ascent;

        const value = props.selectProp(data_row, column_def);
        const text = is_number(value) ? value.toString() : (value as string);

        renderer_submit(ct.renderer, {
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

  renderer_render(ct.renderer, ctx, ct.canvas.width, ct.canvas.height);

  ct.prev_mouse_buttons = ct.curr_mouse_buttons;
  ct.scroll_amount_x = 0;
  ct.scroll_amount_y = 0;

  ct.raf_id = requestAnimationFrame(() => update(ct));
}

function calculate_row_rect(ct: Canvas_Table, rowIndex: number) {
  const { state } = ct.tblctx;
  const { theme } = state.props;

  const row_pos = row_screen_y(state, rowIndex);

  return {
    x: 0,
    y: row_pos,
    width: state.body_visible_width,
    height: theme.rowHeight
  };
}

function do_column_resizer(ct: Canvas_Table) {
  const { state } = ct.tblctx;

  const clip_region = new Path2D();
  clip_region.rect(
    state.header_area_x,
    state.header_area_y,
    state.header_area_height,
    state.header_area_height
  );

  if (is_active(ct.ui, "column-resizer")) {
    do_one_column_resizer(ct, ct.ui.active!, clip_region);
    return;
  }

  for (const column_index of table_column_range(state)) {
    const id = create_id("column-resizer", column_index);
    do_one_column_resizer(ct, id, clip_region);
  }
}

function do_one_column_resizer(ct: Canvas_Table, id: UI_ID, clip_region: Path2D) {
  const { theme } = ct.tblctx.state.props;

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
  const { state } = ct.tblctx;

  pos.y = 1;

  const column_index = id.index!;
  const column_pos = column_screen_x(state, column_index);
  const calculated_column_width = pos.x - column_pos + COLUMN_RESIZER_LEFT_WIDTH;
  const column_width = Math.max(calculated_column_width, MIN_COLUMN_WIDTH);

  resize_table_column(state, column_index, column_width);

  const rect = calculate_column_resizer_rect(ct, column_index);
  pos.x = rect.x;
}

function calculate_column_resizer_rect(ct: Canvas_Table, column_index: number) {
  const { state } = ct.tblctx;
  const { theme } = state.props;

  const column_width = state.column_widths[column_index];

  const canonical_column_left = column_scroll_x(state, column_index);
  const screen_column_left = canonical_column_left - state.scroll_x;
  const screen_column_right = screen_column_left + column_width;

  const screen_scroll_end = scroll_to_screen_x(state, state.scroll_width_min_capped);

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
  const { state } = ct.tblctx;

  const hsb_thumb_x = clamp(pos.x, state.hsb_thumb_min_x, state.hsb_thumb_max_x);
  pos.x = hsb_thumb_x;
  pos.y = state.hsb_track_y;

  const new_scroll_x = Math.round(
    lerp(hsb_thumb_x, state.hsb_thumb_min_x, state.hsb_thumb_max_x, 0, state.max_scroll_x)
  );
  scroll_table_to(state, new_scroll_x, state.scroll_y);
}

function on_drag_vertical_scrollbar(ct: Canvas_Table, pos: Vector) {
  const { state } = ct.tblctx;

  const vsb_thumb_y = clamp(pos.y, state.vsb_thumb_min_y, state.vsb_thumb_max_y);
  pos.y = vsb_thumb_y;
  pos.x = state.vsb_track_x;

  const new_scroll_y = Math.round(
    lerp(vsb_thumb_y, state.vsb_thumb_min_y, state.vsb_thumb_max_y, 0, state.max_scroll_y)
  );
  scroll_table_to(state, state.scroll_x, new_scroll_y);
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

  renderer_submit(ct.renderer, {
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
