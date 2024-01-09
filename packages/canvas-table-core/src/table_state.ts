import { lerp, shallow_merge } from "./utils";
import { DEFAULT_COLUMN_WIDTH, MIN_THUMB_LENGTH } from "./constants";
import { Table_Props, Table_State, Table_Context, Column_Def } from "./types";

export function make_table_state(tblctx: Table_Context, props: Table_Props): Table_State {
  return {
    tblctx,
    props,
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
    actual_body_width: 1,
    actual_body_height: 1,
    body_x: 0,
    body_y: 0,
    body_width: 0,
    body_height: 0,
    scroll_x: 0,
    scroll_y: 0,
    scroll_width: 1,
    scroll_height: 1,
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
    vsb_traack_height: 1,
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
    ...props
  } as Table_State;
}

export function update_props(state: Table_State, props: Partial<Table_Props>) {
  if (props.columnDefs && !Object.is(props.columnDefs, state.props.columnDefs)) {
    state.column_widths = calculate_column_widths(props.columnDefs);
  }

  shallow_merge(state.props, props);
}

export function recalculate_state(state: Table_State) {
  recalculate_layout_state(state);
  recalculate_scrollbar_thumb_positions(state);
  recalculate_viewport_state(state);
}

export function resize_table_column(state: Table_State, columnIndex: number, columnWidth: number) {
  const { column_widths } = state.tblctx.state;
  column_widths[columnIndex] = columnWidth;

  recalculate_layout_state(state);

  state.scroll_x = Math.min(state.scroll_x, state.max_scroll_x);
  state.scroll_y = Math.min(state.scroll_y, state.max_scroll_y);
  recalculate_scrollbar_thumb_positions(state);
  recalculate_viewport_state(state);

  const columnDef = state.props.columnDefs[columnIndex];
  state.props.onResizeColumn?.(columnDef.key, columnWidth);
}

export function scroll_table_to(state: Table_State, scrollX: number, scrollY: number) {
  state.scroll_x = scrollX;
  state.scroll_y = scrollY;
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

export function canonical_column_pos(state: Table_State, columnIndex: number) {
  return state.canonical_column_positions[columnIndex];
}

export function canonical_row_pos(state: Table_State, rowIndex: number) {
  return rowIndex * state.props.theme.rowHeight;
}

export function screen_column_pos(state: Table_State, colIndex: number) {
  const canonicalColumnPos = canonical_column_pos(state, colIndex);
  const screenColumnX = canonical_to_screen_x(state, canonicalColumnPos);
  return screenColumnX;
}

export function screen_row_pos(state: Table_State, rowIndex: number) {
  const canonicalRowPos = canonical_row_pos(state, rowIndex);
  const screenRowY = canonical_to_screen_y(state, canonicalRowPos) + state.props.theme.rowHeight;
  return screenRowY;
}

export function canonical_to_screen_x(state: Table_State, canonicalX: number) {
  return canonicalX - state.scroll_x;
}

export function canonical_to_screen_y(state: Table_State, canonicalY: number) {
  return canonicalY - state.scroll_y;
}

export function screen_to_canonical_x(state: Table_State, screenX: number) {
  return screenX + state.scroll_x;
}

export function screen_to_canonical_y(state: Table_State, screenY: number) {
  return screenY + state.scroll_y;
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
  let actualBodyWidth = 0;
  for (const width of state.column_widths) {
    actualBodyWidth += width;
  }
  state.actual_body_width = actualBodyWidth;

  state.actual_body_height = state.props.dataRows.length * state.props.theme.rowHeight;

  const outerTableWidth = state.tblctx.canvas.width - 1;
  const outerTableHeight = state.tblctx.canvas.height - 1;

  const innerTableWidth = outerTableWidth - state.props.theme.scrollbarThickness - 1;
  const innerTableHeight = outerTableHeight - state.props.theme.scrollbarThickness - 1;

  const outerBodyHeight = outerTableHeight - state.props.theme.rowHeight;
  const innerBodyHeight = innerTableHeight - state.props.theme.rowHeight;

  if (outerTableWidth >= state.actual_body_width && outerBodyHeight >= state.actual_body_height) {
    state.overflow_x = state.overflow_y = false;
  } else {
    state.overflow_x = innerTableWidth < state.actual_body_width;
    state.overflow_y = innerBodyHeight < state.actual_body_height;
  }

  let tableWidth: number;
  let bodyWidth: number;

  if (state.overflow_y) {
    tableWidth = bodyWidth = innerTableWidth;
  } else {
    tableWidth = bodyWidth = outerTableWidth;
  }

  let tableHeight: number;
  let bodyHeight: number;

  if (state.overflow_x) {
    tableHeight = innerTableHeight;
    bodyHeight = innerBodyHeight;
  } else {
    tableHeight = outerTableHeight;
    bodyHeight = outerBodyHeight;
  }

  state.table_area_x = 0;
  state.table_area_y = 0;
  state.table_area_width = tableWidth;
  state.table_area_height = tableHeight;

  state.body_area_x = 0;
  state.body_area_y = state.props.theme.rowHeight;
  state.body_area_width = bodyWidth;
  state.body_area_height = bodyHeight;

  state.header_area_x = 0;
  state.header_area_y = 0;
  state.header_area_width = tableWidth;
  state.header_area_height = state.props.theme.rowHeight;

  state.scroll_width = Math.max(state.actual_body_width, bodyWidth);
  state.scroll_height = Math.max(state.actual_body_height, bodyHeight);

  state.max_scroll_x = state.scroll_width - bodyWidth;
  state.max_scroll_y = state.scroll_height - bodyHeight;

  state.body_y = state.body_area_y;
  state.body_width = Math.min(state.body_area_width, state.actual_body_width);
  state.body_height = Math.min(state.body_area_height, state.actual_body_height);

  state.hsb_x = 1;
  state.hsb_y = tableHeight + 1;
  state.hsb_width = tableWidth - 1;
  state.hsb_height = state.props.theme.scrollbarThickness;

  state.hsb_track_x = state.hsb_x + state.props.theme.scrollbarTrackMargin;
  state.hsb_track_y = state.hsb_y + state.props.theme.scrollbarTrackMargin;
  state.hsb_track_width = state.hsb_width - state.props.theme.scrollbarTrackMargin * 2;
  state.hsb_track_height = state.hsb_height - state.props.theme.scrollbarTrackMargin * 2;

  state.hsb_thumb_y = state.hsb_track_y;
  state.hsb_thumb_height = state.hsb_track_height;
  state.hsb_thumb_width = Math.max(
    (bodyWidth / state.scroll_width) * state.hsb_track_width,
    MIN_THUMB_LENGTH
  );
  state.hsb_thumb_min_x = state.hsb_track_x;
  state.hsb_thumb_max_x = state.hsb_track_x + state.hsb_track_width - state.hsb_thumb_width;

  state.vsb_x = tableWidth + 1;
  state.vsb_y = state.props.theme.rowHeight + 1;
  state.vsb_width = state.props.theme.scrollbarThickness;
  state.vsb_height = bodyHeight - 1;

  state.vsb_track_x = state.vsb_x + state.props.theme.scrollbarTrackMargin;
  state.vsb_track_y = state.vsb_y + state.props.theme.scrollbarTrackMargin;
  state.vsb_track_width = state.vsb_width - state.props.theme.scrollbarTrackMargin * 2;
  state.vsb_traack_height = state.vsb_height - state.props.theme.scrollbarTrackMargin * 2;

  state.vsb_thumb_x = state.vsb_track_x;
  state.vsb_thumb_width = state.vsb_track_width;
  state.vsb_thumb_height = Math.max(
    (bodyHeight / state.scroll_height) * state.vsb_traack_height,
    MIN_THUMB_LENGTH
  );
  state.vsb_thumb_min_y = state.vsb_track_y;
  state.vsb_thumb_max_y = state.vsb_track_y + state.vsb_traack_height - state.vsb_thumb_height;
}

function recalculate_viewport_state(state: Table_State) {
  let columnPos = 0;
  state.canonical_column_positions = [];

  for (
    state.column_start = 0;
    state.column_start < state.column_widths.length;
    state.column_start++
  ) {
    const columnWidth = state.column_widths[state.column_start];
    const nextColumnPos = columnPos + columnWidth;
    if (nextColumnPos > state.scroll_x) {
      break;
    }
    state.canonical_column_positions.push(columnPos);
    columnPos = nextColumnPos;
  }

  const scrollRight = state.scroll_x + state.body_area_width;

  for (
    state.column_end = state.column_start;
    state.column_end < state.column_widths.length;
    state.column_end++
  ) {
    if (columnPos >= scrollRight) {
      break;
    }
    state.canonical_column_positions.push(columnPos);
    columnPos += state.column_widths[state.column_end];
  }

  state.row_start = Math.floor(state.scroll_y / state.props.theme.rowHeight);

  const scrollBottom = state.scroll_y + state.body_area_height;
  state.row_end = Math.min(
    Math.ceil(scrollBottom / state.props.theme.rowHeight),
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
