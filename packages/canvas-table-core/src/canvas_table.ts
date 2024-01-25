import { make_renderer, push_draw_command, render } from "./renderer";
import {
  make_gui_context,
  destroy_gui_context,
  start_animation,
  get_font_metrics,
  set_active_widget,
  set_hot_widget,
  is_widget_hot,
  is_widget_active,
  is_no_widget_active,
  is_mouse_in_rect,
  is_mouse_pressed,
  is_mouse_released
} from "./gui_context";
import { default_theme } from "./default_theme";
import { clamp, lerp, create_font_specifier, is_number, shallow_merge, is_empty } from "./utils";
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  MIN_THUMB_LENGTH,
  MOUSE_BUTTONS
} from "./constants";
import {
  Canvas_Table,
  Table_Props,
  Create_Canvas_Table_Params,
  Column_Def,
  Data_Row,
  Data_Row_ID,
  Prop_Value
} from "./types";

export function make_canvas_table(params: Create_Canvas_Table_Params): Canvas_Table {
  const { container, ...partial_props } = params;

  const gui = make_gui_context(container);

  const theme = params.theme ?? default_theme;
  const selectId = params.selectId ?? default_id_selector;
  const selectProp = params.selectProp ?? default_prop_selector;
  const props = {
    ...partial_props,
    theme,
    selectId,
    selectProp
  };

  const renderer = make_renderer({ canvas: gui.canvas, ctx: gui.ctx });

  const batched_props = [] as Partial<Table_Props>[];

  const ct = {
    renderer,
    gui,

    props,
    batched_props,

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
    mouse_row: -1,
    column_widths: calc_column_widths(props.columnDefs),
    canonical_column_positions: [] as number[],
    selected_row_id: null
  } as Canvas_Table;

  gui.update_function = () => update(ct);
  start_animation(gui);

  return ct;
}

export function config_canvas_table(ct: Canvas_Table, props: Partial<Table_Props>) {
  ct.batched_props.push(props);
}

export function destroy_canvas_table(ct: Canvas_Table) {
  destroy_gui_context(ct.gui);
}

function update(ct: Canvas_Table) {
  const { gui, renderer, props } = ct;
  const { theme } = props;

  let table_resized = false;
  if (ct.table_width !== gui.canvas.width || ct.table_height !== gui.canvas.height) {
    ct.table_width = gui.canvas.width;
    ct.table_height = gui.canvas.height;
    table_resized = true;
  }

  let data_changed = false;
  {
    const new_props = {} as Partial<Table_Props>;
    while (ct.batched_props.length > 0) {
      shallow_merge(new_props, ct.batched_props.shift());
    }

    if (!is_empty(new_props)) {
      if (new_props.columnDefs && !Object.is(new_props.columnDefs, props.columnDefs)) {
        ct.column_widths = calc_column_widths(new_props.columnDefs);
        data_changed = true;
      }

      if (new_props.dataRows && !Object.is(new_props.dataRows, props.dataRows)) {
        data_changed = true;
      }

      if (new_props.theme && !Object.is(new_props.theme, props.theme)) {
        data_changed = true;
      }

      shallow_merge(props, new_props);
    }
  }

  if (table_resized || data_changed) {
    refresh_layout(ct);
  }

  let scroll_pos_changed = false;
  {
    let new_scroll_x = ct.scroll_x;
    let new_scroll_y = ct.scroll_y;
    if (is_no_widget_active(ct.gui)) {
      new_scroll_x += gui.scroll_amount_x;
      new_scroll_y += gui.scroll_amount_y;
    }
    new_scroll_x = clamp(new_scroll_x, 0, ct.max_scroll_x);
    new_scroll_y = clamp(new_scroll_y, 0, ct.max_scroll_y);

    if (new_scroll_x !== ct.scroll_x || new_scroll_y !== ct.scroll_y) {
      ct.scroll_x = new_scroll_x;
      ct.scroll_y = new_scroll_y;

      scroll_pos_changed = true;
    }
  }

  if (table_resized || data_changed || scroll_pos_changed) {
    refresh_viewport(ct);

    ct.hsb_thumb_x = calc_hsb_thumb_x(ct, ct.scroll_x);
    ct.vsb_thumb_y = calc_vsb_thumb_y(ct, ct.scroll_y);
  }

  if (is_mouse_in_rect(gui, ct.body_area_x, ct.body_area_y, ct.body_visible_width, ct.body_visible_height)) {
    ct.mouse_row = Math.floor((screen_to_scroll_y(ct, gui.curr_mouse_y) - theme.rowHeight) / theme.rowHeight);
  } else {
    ct.mouse_row = -1;
  }

  // Do column resizers
  for (const column_index of table_column_range(ct)) {
    const id = `column-resizer-${column_index}`;

    let resizer_scroll_x = calc_resizer_scroll_pos(ct, column_index);

    if (is_widget_active(gui, id)) {
      if (is_mouse_released(gui, MOUSE_BUTTONS.PRIMARY)) {
        set_active_widget(gui, null);
      } else {
        const column_scroll_left = calc_column_scroll_x(ct, column_index);
        const column_scroll_right = gui.drag_anchor_x + gui.drag_distance_x;
        const column_width = Math.max(column_scroll_right - column_scroll_left, MIN_COLUMN_WIDTH);
        resize_table_column(ct, column_index, column_width);

        resizer_scroll_x = calc_resizer_scroll_pos(ct, column_index);
      }
    } else if (is_widget_hot(gui, id)) {
      if (is_mouse_pressed(gui, MOUSE_BUTTONS.PRIMARY)) {
        set_active_widget(gui, id);

        gui.drag_anchor_x = resizer_scroll_x + COLUMN_RESIZER_LEFT_WIDTH;
      }
    }

    const resizer_x = scroll_to_screen_x(ct, resizer_scroll_x);
    const resizer_y = BORDER_WIDTH;
    const resizer_width = COLUMN_RESIZER_WIDTH;
    const resizer_height = theme.rowHeight - BORDER_WIDTH;

    const inside = is_mouse_in_rect(gui, resizer_x, resizer_y, resizer_width, resizer_height);
    if (inside) {
      set_hot_widget(gui, id);
    } else if (is_widget_hot(gui, id)) {
      set_hot_widget(gui, null);
    }

    if (is_widget_active(gui, id) || is_widget_hot(gui, id)) {
      push_draw_command(ct.renderer, {
        type: "rect",
        x: resizer_x,
        y: resizer_y,
        width: resizer_width,
        height: resizer_height,
        fill_color: theme.columnResizerColor,
        clip_region: make_header_area_clip_region(ct),
        sort_order: 3
      });
      break;
    }
  }

  // Do horizontal scrollbar
  if (ct.overflow_x) {
    if (theme.scrollbarTrackColor) {
      push_draw_command(renderer, {
        type: "rect",
        x: ct.hsb_x,
        y: ct.hsb_y,
        width: ct.hsb_width,
        height: ct.hsb_height,
        fill_color: theme.scrollbarTrackColor,
        sort_order: 1
      });
    }

    {
      let { hsb_thumb_x } = ct;

      const id = "horizontal-scrollbar-thumb";
      if (is_widget_active(gui, id)) {
        if (is_mouse_released(gui, MOUSE_BUTTONS.PRIMARY)) {
          set_active_widget(gui, null);
        } else {
          hsb_thumb_x = clamp(gui.drag_anchor_x + gui.drag_distance_x, ct.hsb_thumb_min_x, ct.hsb_thumb_max_x);
          ct.hsb_thumb_x = hsb_thumb_x;

          ct.scroll_x = calc_scroll_x(ct, hsb_thumb_x);
          refresh_viewport(ct);
        }
      } else if (is_widget_hot(gui, id)) {
        if (is_mouse_pressed(gui, MOUSE_BUTTONS.PRIMARY)) {
          set_active_widget(gui, id);

          gui.drag_anchor_x = hsb_thumb_x;
        }
      }

      const { hsb_thumb_y, hsb_thumb_width, hsb_thumb_height } = ct;
      const inside = is_mouse_in_rect(gui, hsb_thumb_x, hsb_thumb_y, hsb_thumb_width, hsb_thumb_height);
      if (inside) {
        set_hot_widget(gui, id);
      } else if (is_widget_hot(gui, id)) {
        set_hot_widget(gui, null);
      }

      let fill_color: string | undefined;
      if (is_widget_active(gui, id)) {
        fill_color = theme.scrollbarThumbPressedColor;
      } else if (is_widget_hot(gui, id)) {
        fill_color = theme.scrollbarThumbHoverColor;
      } else {
        fill_color = theme.scrollbarThumbColor;
      }

      if (fill_color) {
        push_draw_command(ct.renderer, {
          type: "rect",
          fill_color,
          x: hsb_thumb_x,
          y: hsb_thumb_y,
          width: hsb_thumb_width,
          height: hsb_thumb_height,
          sort_order: 3
        });
      }
    }
  }

  // Do vertical scrollbar
  if (ct.overflow_y) {
    if (theme.scrollbarTrackColor) {
      push_draw_command(renderer, {
        type: "rect",
        x: ct.vsb_x,
        y: ct.vsb_y,
        width: ct.vsb_width,
        height: ct.vsb_height,
        fill_color: theme.scrollbarTrackColor,
        sort_order: 1
      });
    }

    {
      let { vsb_thumb_y } = ct;

      const id = "vertical-scrollbar-thumb";
      if (is_widget_active(gui, id)) {
        if (is_mouse_released(gui, MOUSE_BUTTONS.PRIMARY)) {
          set_active_widget(gui, null);
        } else {
          vsb_thumb_y = clamp(gui.drag_anchor_y + gui.drag_distance_y, ct.vsb_thumb_min_y, ct.vsb_thumb_max_y);
          ct.vsb_thumb_y = vsb_thumb_y;

          ct.scroll_y = calc_scroll_y(ct, vsb_thumb_y);
          refresh_viewport(ct);
        }
      } else if (is_widget_hot(gui, id)) {
        if (is_mouse_pressed(gui, MOUSE_BUTTONS.PRIMARY)) {
          set_active_widget(gui, id);

          gui.drag_anchor_y = ct.vsb_thumb_y;
        }
      }

      const { vsb_thumb_x, vsb_thumb_width, vsb_thumb_height } = ct;
      const inside = is_mouse_in_rect(gui, vsb_thumb_x, vsb_thumb_y, vsb_thumb_width, vsb_thumb_height);
      if (inside) {
        set_hot_widget(gui, id);
      } else if (is_widget_hot(gui, id)) {
        set_hot_widget(gui, null);
      }

      let fill_color: string | undefined;
      if (is_widget_active(gui, id)) {
        fill_color = theme.scrollbarThumbPressedColor;
      } else if (is_widget_hot(gui, id)) {
        fill_color = theme.scrollbarThumbHoverColor;
      } else {
        fill_color = theme.scrollbarThumbColor;
      }

      if (fill_color) {
        push_draw_command(ct.renderer, {
          type: "rect",
          fill_color,
          x: vsb_thumb_x,
          y: vsb_thumb_y,
          width: vsb_thumb_width,
          height: vsb_thumb_height,
          sort_order: 3
        });
      }
    }
  }

  // Draw hovered and selected rows
  if (ct.mouse_row !== -1) {
    const data_row = props.dataRows[ct.mouse_row];
    if (is_mouse_pressed(gui, MOUSE_BUTTONS.PRIMARY)) {
      const data_row_id = props.selectId(data_row);
      if (data_row_id !== ct.selected_row_id) {
        ct.selected_row_id = data_row_id;
        props.onSelectRow?.(data_row_id, data_row);
      }
    }

    if (theme.hoveredRowColor && is_no_widget_active(ct.gui)) {
      push_draw_command(renderer, {
        type: "rect",
        x: 0,
        y: calc_row_screen_y(ct, ct.mouse_row),
        width: ct.body_visible_width,
        height: theme.rowHeight,
        fill_color: theme.hoveredRowColor,
        clip_region: make_body_area_clip_region(ct)
      });
    }
  }

  if (ct.selected_row_id !== null) {
    for (const row_index of table_row_range(ct)) {
      const data_row = props.dataRows[row_index];
      const data_row_id = props.selectId(data_row);
      if (ct.selected_row_id === data_row_id) {
        push_draw_command(renderer, {
          type: "rect",
          x: 0,
          y: calc_row_screen_y(ct, row_index),
          width: ct.body_visible_width,
          height: theme.rowHeight,
          fill_color: theme.selectedRowColor,
          clip_region: make_body_area_clip_region(ct)
        });
        break;
      }
    }
  }

  if (theme.tableBackgroundColor) {
    push_draw_command(renderer, {
      type: "rect",
      x: 0,
      y: 0,
      width: ct.table_width,
      height: ct.table_height,
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

  // Draw top outer table border
  push_draw_command(renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: 0,
    length: ct.table_width,
    color: theme.tableBorderColor,
    sort_order: 2
  });

  // Draw bottom outer table border
  push_draw_command(renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: ct.table_height - 1,
    length: ct.table_width,
    color: theme.tableBorderColor,
    sort_order: 2
  });

  // Draw left outer table border
  push_draw_command(renderer, {
    type: "line",
    orientation: "vertical",
    x: 0,
    y: 0,
    length: ct.table_height,
    color: theme.tableBorderColor,
    sort_order: 2
  });

  // Draw right outer table border
  push_draw_command(renderer, {
    type: "line",
    orientation: "vertical",
    x: ct.table_width - 1,
    y: 0,
    length: ct.table_height,
    color: theme.tableBorderColor,
    sort_order: 2
  });

  const grid_width = ct.body_visible_width;
  const grid_height = ct.body_visible_height + theme.rowHeight;

  // Draw header bottom border
  push_draw_command(renderer, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: theme.rowHeight,
    length: ct.table_width,
    color: theme.tableBorderColor,
    sort_order: 2
  });

  // If horizontal scrollbar is visible, draw its border, otherwise,
  // draw table content right border
  if (ct.overflow_x) {
    push_draw_command(renderer, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: ct.hsb_y - 1,
      length: ct.table_width,
      color: theme.tableBorderColor,
      sort_order: 2
    });
  } else {
    push_draw_command(renderer, {
      type: "line",
      orientation: "vertical",
      x: grid_width,
      y: 0,
      length: grid_height,
      color: theme.tableBorderColor,
      sort_order: 2
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
      length: ct.table_height,
      color: theme.tableBorderColor,
      sort_order: 2
    });
  } else {
    push_draw_command(renderer, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: grid_height,
      length: grid_width,
      color: theme.tableBorderColor,
      sort_order: 2
    });
  }

  // Draw grid horizontal lines
  for (const row_index of table_row_range(ct, 1)) {
    push_draw_command(renderer, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: calc_row_screen_y(ct, row_index),
      length: grid_width,
      color: theme.tableBorderColor,
      sort_order: 2
    });
  }

  // Draw grid vertical lines
  for (const column_index of table_column_range(ct, 1)) {
    push_draw_command(renderer, {
      type: "line",
      orientation: "vertical",
      x: calc_column_screen_x(ct, column_index),
      y: 0,
      length: grid_height,
      color: theme.tableBorderColor,
      sort_order: 2
    });
  }

  // Draw header text
  {
    const actual_font_stye = theme.headerFontStyle ?? theme.fontStyle;
    const font = create_font_specifier(theme.fontFamily, theme.fontSize, actual_font_stye);

    const { fontBoundingBoxAscent } = get_font_metrics(gui, font);
    const half_font_bounding_box_ascent = Math.floor(fontBoundingBoxAscent / 2);

    const actual_font_color = theme.headerFontColor ?? theme.fontColor;

    const clip_region = make_header_area_clip_region(ct);

    for (const column_index of table_column_range(ct)) {
      const column_def = props.columnDefs[column_index];
      const column_width = ct.column_widths[column_index];

      const column_pos = calc_column_screen_x(ct, column_index);

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

  // Draw body text
  {
    const actual_font_style = theme.bodyFontStyle ?? theme.fontStyle;
    const font = create_font_specifier(theme.fontFamily, theme.fontSize, actual_font_style);

    const { fontBoundingBoxAscent } = get_font_metrics(gui, font);
    const half_font_bounding_box_ascent = Math.floor(fontBoundingBoxAscent / 2);

    const actual_font_color = theme.bodyFontColor ?? theme.fontColor;

    const clip_region = make_body_area_clip_region(ct);

    for (const column_index of table_column_range(ct)) {
      const column_def = props.columnDefs[column_index];
      const column_width = ct.column_widths[column_index];

      const column_pos = calc_column_screen_x(ct, column_index);

      const x = column_pos + theme.cellPadding;
      const max_width = column_width - theme.cellPadding * 2;

      for (const row_index of table_row_range(ct)) {
        const data_row = props.dataRows[row_index];

        const row_pos = calc_row_screen_y(ct, row_index);

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
}

function refresh_layout(ct: Canvas_Table) {
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
  ct.hsb_thumb_width = Math.max((body_area_width / ct.scroll_width_min_capped) * ct.hsb_track_width, MIN_THUMB_LENGTH);
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
  ct.vsb_thumb_height = Math.max((body_area_height / ct.scroll_height_min_capped) * ct.vsb_track_height, MIN_THUMB_LENGTH);
  ct.vsb_thumb_min_y = ct.vsb_track_y;
  ct.vsb_thumb_max_y = ct.vsb_track_y + ct.vsb_track_height - ct.vsb_thumb_height;
}

function refresh_viewport(ct: Canvas_Table) {
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

function resize_table_column(ct: Canvas_Table, column_index: number, column_width: number) {
  ct.column_widths[column_index] = column_width;

  refresh_layout(ct);

  ct.scroll_x = Math.min(ct.scroll_x, ct.max_scroll_x);
  ct.scroll_y = Math.min(ct.scroll_y, ct.max_scroll_y);

  refresh_viewport(ct);

  ct.hsb_thumb_x = calc_hsb_thumb_x(ct, ct.scroll_x);
  ct.vsb_thumb_y = calc_vsb_thumb_y(ct, ct.scroll_y);

  const column_def = ct.props.columnDefs[column_index];
  ct.props.onResizeColumn?.(column_def.key, column_width);
}

function* table_column_range(ct: Canvas_Table, start = 0) {
  for (let j = ct.column_start + start; j < ct.column_end; j++) {
    yield j;
  }
}

function* table_row_range(ct: Canvas_Table, start = 0) {
  for (let i = ct.row_start + start; i < ct.row_end; i++) {
    yield i;
  }
}

function calc_resizer_scroll_pos(ct: Canvas_Table, column_index: number) {
  const { scroll_width_min_capped, column_widths } = ct;

  const column_width = column_widths[column_index];
  const column_scroll_left = calc_column_scroll_x(ct, column_index);
  const column_scroll_right = column_scroll_left + column_width;
  const resizer_scroll_left = Math.min(
    column_scroll_right - COLUMN_RESIZER_LEFT_WIDTH,
    scroll_width_min_capped - COLUMN_RESIZER_WIDTH
  );
  return resizer_scroll_left;
}

function calc_column_widths(column_defs: Column_Def[]) {
  const column_widths = [] as number[];
  for (const { width } of column_defs) {
    column_widths.push(width ?? DEFAULT_COLUMN_WIDTH);
  }
  return column_widths;
}

function calc_column_scroll_x(ct: Canvas_Table, column_index: number) {
  return ct.canonical_column_positions[column_index];
}

function calc_row_scroll_y(ct: Canvas_Table, row_index: number) {
  return row_index * ct.props.theme.rowHeight;
}

function calc_column_screen_x(ct: Canvas_Table, column_index: number) {
  const canonical_pos = calc_column_scroll_x(ct, column_index);
  const screen_column_x = scroll_to_screen_x(ct, canonical_pos);
  return screen_column_x;
}

function calc_row_screen_y(ct: Canvas_Table, row_index: number) {
  const canonical_pos = calc_row_scroll_y(ct, row_index);
  const screen_row_y = scroll_to_screen_y(ct, canonical_pos) + ct.props.theme.rowHeight;
  return screen_row_y;
}

function scroll_to_screen_x(ct: Canvas_Table, canonical_x: number) {
  return canonical_x - ct.scroll_x;
}

function scroll_to_screen_y(ct: Canvas_Table, canonical_y: number) {
  return canonical_y - ct.scroll_y;
}

function screen_to_scroll_y(ct: Canvas_Table, screen_y: number) {
  return screen_y + ct.scroll_y;
}

function calc_scroll_x(ct: Canvas_Table, hsb_thumb_x: number) {
  return Math.round(lerp(hsb_thumb_x, ct.hsb_thumb_min_x, ct.hsb_thumb_max_x, 0, ct.max_scroll_x));
}

function calc_scroll_y(ct: Canvas_Table, vsb_thumb_y: number) {
  return Math.round(lerp(vsb_thumb_y, ct.vsb_thumb_min_y, ct.vsb_thumb_max_y, 0, ct.max_scroll_y));
}

function calc_hsb_thumb_x(ct: Canvas_Table, scroll_x: number) {
  return Math.round(lerp(scroll_x, 0, ct.max_scroll_x, ct.hsb_thumb_min_x, ct.hsb_thumb_max_x));
}

function calc_vsb_thumb_y(ct: Canvas_Table, scroll_y: number) {
  return Math.round(lerp(scroll_y, 0, ct.max_scroll_y, ct.vsb_thumb_min_y, ct.vsb_thumb_max_y));
}

function make_body_area_clip_region(ct: Canvas_Table) {
  const body_clip_region = new Path2D();
  body_clip_region.rect(ct.body_area_x, ct.body_area_y, ct.body_area_width, ct.body_area_height);
  return body_clip_region;
}

function make_header_area_clip_region(ct: Canvas_Table) {
  const header_area_region = new Path2D();
  header_area_region.rect(
    ct.header_area_x,
    ct.header_area_y,
    ct.header_area_width,
    ct.header_area_height
  );
  return header_area_region;
}

function default_id_selector(row: Data_Row) {
  return row.id as Data_Row_ID;
}

function default_prop_selector(row: Data_Row, column_def: Column_Def) {
  return row[column_def.key] as Prop_Value;
}
