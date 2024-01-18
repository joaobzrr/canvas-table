import { lerp, shallow_merge } from "./utils";
import { DEFAULT_COLUMN_WIDTH, MIN_THUMB_LENGTH, BORDER_WIDTH } from "./constants";
import { Table_Props, Table_State, Column_Def } from "./types";

export function make_table_state(props: Table_Props): Table_State {
  return {
    props,
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
    selected_row_id: null,
    should_reflow: false,
    ...props
  } as Table_State;
}

export function update_props(state: Table_State, props: Partial<Table_Props>) {
  const { columnDefs, dataRows, theme, ...rest } = props;

  let should_reflow = false;

  if (columnDefs && !Object.is(columnDefs, state.props.columnDefs)) {
    state.props.columnDefs = columnDefs;
    state.column_widths = calculate_column_widths(columnDefs);
    should_reflow = true;
  }

  if (dataRows && !Object.is(dataRows, state.props.dataRows)) {
    state.props.dataRows = dataRows;
    should_reflow = true;
  }

  if (theme && !Object.is(theme, state.props.theme)) {
    state.props.theme = theme;
    should_reflow = true;
  }

  state.should_reflow ||= should_reflow;

  shallow_merge(state.props, rest);
}

export function set_table_size(state: Table_State, width: number, height: number) {
  const should_reflow = state.table_width !== width || state.table_height !== height;
  state.table_width = width;
  state.table_height = height;
  state.should_reflow ||= should_reflow;
}

export function reflow(state: Table_State) {
  recalculate_layout_state(state);
  recalculate_scrollbar_thumb_positions(state);
  recalculate_viewport_state(state);

  state.should_reflow = false;
}

export function resize_table_column(
  state: Table_State,
  column_index: number,
  column_width: number
) {
  const { column_widths } = state;
  column_widths[column_index] = column_width;

  recalculate_layout_state(state);

  state.scroll_x = Math.min(state.scroll_x, state.max_scroll_x);
  state.scroll_y = Math.min(state.scroll_y, state.max_scroll_y);
  recalculate_scrollbar_thumb_positions(state);
  recalculate_viewport_state(state);

  const column_def = state.props.columnDefs[column_index];
  state.props.onResizeColumn?.(column_def.key, column_width);
}

export function scroll_table_to(state: Table_State, scroll_x: number, scroll_y: number) {
  state.scroll_x = scroll_x;
  state.scroll_y = scroll_y;
  recalculate_scrollbar_thumb_positions(state);
  recalculate_viewport_state(state);
}

export function* table_column_range(state: Table_State, start = 0) {
  for (let j = state.column_start + start; j < state.column_end; j++) {
    yield j;
  }
}

export function* table_row_range(state: Table_State, start = 0) {
  for (let i = state.row_start + start; i < state.row_end; i++) {
    yield i;
  }
}

export function column_scroll_x(state: Table_State, column_index: number) {
  return state.canonical_column_positions[column_index];
}

export function row_scroll_y(state: Table_State, row_index: number) {
  return row_index * state.props.theme.rowHeight;
}

export function column_screen_x(state: Table_State, column_index: number) {
  const canonical_pos = column_scroll_x(state, column_index);
  const screen_column_x = scroll_to_screen_x(state, canonical_pos);
  return screen_column_x;
}

export function row_screen_y(state: Table_State, row_index: number) {
  const canonical_pos = row_scroll_y(state, row_index);
  const screen_row_y = scroll_to_screen_y(state, canonical_pos) + state.props.theme.rowHeight;
  return screen_row_y;
}

export function scroll_to_screen_x(state: Table_State, canonical_x: number) {
  return canonical_x - state.scroll_x;
}

export function scroll_to_screen_y(state: Table_State, canonical_y: number) {
  return canonical_y - state.scroll_y;
}

export function screen_to_scroll_x(state: Table_State, screen_x: number) {
  return screen_x + state.scroll_x;
}

export function screen_to_scroll_y(state: Table_State, screen_y: number) {
  return screen_y + state.scroll_y;
}

export function make_body_area_clip_region(state: Table_State) {
  const body_clip_region = new Path2D();
  body_clip_region.rect(
    state.body_area_x,
    state.body_area_y,
    state.body_area_width,
    state.body_area_height
  );
  return body_clip_region;
}

export function make_header_area_clip_region(state: Table_State) {
  const header_area_region = new Path2D();
  header_area_region.rect(
    state.header_area_x,
    state.header_area_y,
    state.header_area_width,
    state.header_area_height
  );
  return header_area_region;
}

function recalculate_layout_state(state: Table_State) {
  let scroll_width = 0;
  for (const width of state.column_widths) {
    scroll_width += width;
  }

  state.scroll_width = scroll_width;
  state.scroll_height = state.props.dataRows.length * state.props.theme.rowHeight;

  const table_area_outer_width = state.table_width - BORDER_WIDTH;
  const table_area_outer_height = state.table_height - BORDER_WIDTH;

  const table_area_inner_width =
    table_area_outer_width - state.props.theme.scrollbarThickness - BORDER_WIDTH;
  const table_area_inner_height =
    table_area_outer_height - state.props.theme.scrollbarThickness - BORDER_WIDTH;

  const body_area_outer_height = table_area_outer_height - state.props.theme.rowHeight;
  const body_area_inner_height = table_area_inner_height - state.props.theme.rowHeight;

  if (
    table_area_outer_width >= state.scroll_width &&
    body_area_outer_height >= state.scroll_height
  ) {
    state.overflow_x = state.overflow_y = false;
  } else {
    state.overflow_x = table_area_inner_width < state.scroll_width;
    state.overflow_y = body_area_inner_height < state.scroll_height;
  }

  let table_area_width: number;
  let body_area_width: number;

  if (state.overflow_y) {
    table_area_width = body_area_width = table_area_inner_width;
  } else {
    table_area_width = body_area_width = table_area_outer_width;
  }

  let table_area_height: number;
  let body_area_height: number;
  if (state.overflow_x) {
    table_area_height = table_area_inner_height;
    body_area_height = body_area_inner_height;
  } else {
    table_area_height = table_area_outer_height;
    body_area_height = body_area_outer_height;
  }

  state.table_area_x = 0;
  state.table_area_y = 0;
  state.table_area_width = table_area_width;
  state.table_area_height = table_area_height;

  state.body_area_x = 0;
  state.body_area_y = state.props.theme.rowHeight;
  state.body_area_width = body_area_width;
  state.body_area_height = body_area_height;

  state.header_area_x = 0;
  state.header_area_y = 0;
  state.header_area_width = table_area_width;
  state.header_area_height = state.props.theme.rowHeight;

  state.scroll_width_min_capped = Math.max(state.scroll_width, body_area_width);
  state.scroll_height_min_capped = Math.max(state.scroll_height, body_area_height);

  state.max_scroll_x = state.scroll_width_min_capped - body_area_width;
  state.max_scroll_y = state.scroll_height_min_capped - body_area_height;

  state.body_visible_width = Math.min(state.body_area_width, state.scroll_width);
  state.body_visible_height = Math.min(state.body_area_height, state.scroll_height);

  state.hsb_x = BORDER_WIDTH;
  state.hsb_y = table_area_height + BORDER_WIDTH;
  state.hsb_width = table_area_width - BORDER_WIDTH;
  state.hsb_height = state.props.theme.scrollbarThickness;

  state.hsb_track_x = state.hsb_x + state.props.theme.scrollbarTrackMargin;
  state.hsb_track_y = state.hsb_y + state.props.theme.scrollbarTrackMargin;
  state.hsb_track_width = state.hsb_width - state.props.theme.scrollbarTrackMargin * 2;
  state.hsb_track_height = state.hsb_height - state.props.theme.scrollbarTrackMargin * 2;

  state.hsb_thumb_y = state.hsb_track_y;
  state.hsb_thumb_height = state.hsb_track_height;
  state.hsb_thumb_width = Math.max(
    (body_area_width / state.scroll_width_min_capped) * state.hsb_track_width,
    MIN_THUMB_LENGTH
  );
  state.hsb_thumb_min_x = state.hsb_track_x;
  state.hsb_thumb_max_x = state.hsb_track_x + state.hsb_track_width - state.hsb_thumb_width;

  state.vsb_x = table_area_width + BORDER_WIDTH;
  state.vsb_y = state.props.theme.rowHeight + BORDER_WIDTH;
  state.vsb_width = state.props.theme.scrollbarThickness;
  state.vsb_height = body_area_height - BORDER_WIDTH;

  state.vsb_track_x = state.vsb_x + state.props.theme.scrollbarTrackMargin;
  state.vsb_track_y = state.vsb_y + state.props.theme.scrollbarTrackMargin;
  state.vsb_track_width = state.vsb_width - state.props.theme.scrollbarTrackMargin * 2;
  state.vsb_track_height = state.vsb_height - state.props.theme.scrollbarTrackMargin * 2;

  state.vsb_thumb_x = state.vsb_track_x;
  state.vsb_thumb_width = state.vsb_track_width;
  state.vsb_thumb_height = Math.max(
    (body_area_height / state.scroll_height_min_capped) * state.vsb_track_height,
    MIN_THUMB_LENGTH
  );
  state.vsb_thumb_min_y = state.vsb_track_y;
  state.vsb_thumb_max_y = state.vsb_track_y + state.vsb_track_height - state.vsb_thumb_height;
}

function recalculate_viewport_state(state: Table_State) {
  let column_pos = 0;
  state.canonical_column_positions = [];

  for (
    state.column_start = 0;
    state.column_start < state.column_widths.length;
    state.column_start++
  ) {
    const column_width = state.column_widths[state.column_start];
    const next_column_pos = column_pos + column_width;
    if (next_column_pos > state.scroll_x) {
      break;
    }
    state.canonical_column_positions.push(column_pos);
    column_pos = next_column_pos;
  }

  const scroll_right = state.scroll_x + state.body_area_width;

  for (
    state.column_end = state.column_start;
    state.column_end < state.column_widths.length;
    state.column_end++
  ) {
    if (column_pos >= scroll_right) {
      break;
    }
    state.canonical_column_positions.push(column_pos);
    column_pos += state.column_widths[state.column_end];
  }

  state.row_start = Math.floor(state.scroll_y / state.props.theme.rowHeight);

  const scroll_bottom = state.scroll_y + state.body_area_height;
  state.row_end = Math.min(
    Math.ceil(scroll_bottom / state.props.theme.rowHeight),
    state.props.dataRows.length
  );
}

function recalculate_scrollbar_thumb_positions(state: Table_State) {
  state.hsb_thumb_x = lerp(
    state.scroll_x,
    0,
    state.max_scroll_x,
    state.hsb_thumb_min_x,
    state.hsb_thumb_max_x
  );
  state.vsb_thumb_y = lerp(
    state.scroll_y,
    0,
    state.max_scroll_y,
    state.vsb_thumb_min_y,
    state.vsb_thumb_max_y
  );
}

function calculate_column_widths(column_defs: Column_Def[]) {
  const column_widths = [];
  for (const { width } of column_defs) {
    column_widths.push(width ?? DEFAULT_COLUMN_WIDTH);
  }
  return column_widths;
}
