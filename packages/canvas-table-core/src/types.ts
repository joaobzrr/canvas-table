import { MOUSE_BUTTONS } from "./constants";

export type Canvas_Table = {
  renderer: Renderer;
  gui: GUI_Context;

  // State stuff
  props: Table_Props;
  batched_props: Partial<Table_Props>[];

  table_width: number;
  table_height: number;
  table_area_x: number;
  table_area_y: number;
  table_area_width: number;
  table_area_height: number;
  body_area_x: number;
  body_area_y: number;
  body_area_width: number;
  body_area_height: number;
  header_area_x: number;
  header_area_y: number;
  header_area_width: number;
  header_area_height: number;
  body_visible_width: number;
  body_visible_height: number;
  scroll_x: number;
  scroll_y: number;
  scroll_width: number;
  scroll_height: number;
  scroll_width_min_capped: number;
  scroll_height_min_capped: number;
  max_scroll_x: number;
  max_scroll_y: number;
  hsb_x: number;
  hsb_y: number;
  hsb_width: number;
  hsb_height: number;
  hsb_track_x: number;
  hsb_track_y: number;
  hsb_track_width: number;
  hsb_track_height: number;
  hsb_thumb_x: number;
  hsb_thumb_y: number;
  hsb_thumb_width: number;
  hsb_thumb_height: number;
  hsb_thumb_min_x: number;
  hsb_thumb_max_x: number;
  vsb_x: number;
  vsb_y: number;
  vsb_width: number;
  vsb_height: number;
  vsb_track_x: number;
  vsb_track_y: number;
  vsb_track_width: number;
  vsb_track_height: number;
  vsb_thumb_x: number;
  vsb_thumb_y: number;
  vsb_thumb_width: number;
  vsb_thumb_height: number;
  vsb_thumb_min_y: number;
  vsb_thumb_max_y: number;
  overflow_x: boolean;
  overflow_y: boolean;
  column_start: number;
  column_end: number;
  row_start: number;
  row_end: number;
  mouse_row: number;
  column_widths: number[];
  canonical_column_positions: number[];
  selected_row_id: Data_Row_ID | null;
};

export type Create_Canvas_Table_Params = Omit<Table_Props, "theme" | "selectId" | "selectProp"> & {
  container: string;
  theme?: Theme;
  selectId?: ID_Selector;
  selectProp?: Prop_Selector;
};

export type Table_Props = {
  columnDefs: Column_Def[];
  dataRows: Data_Row[];
  theme: Theme;
  selectId: ID_Selector;
  selectProp: Prop_Selector;
  onSelectRow?: Select_Row_Callback;
  onResizeColumn?: Column_Resize_Callback;
};

export type Select_Row_Callback = (id: Data_Row_ID, dataRow: Data_Row) => void;

export type Column_Resize_Callback = (key: string, width: number) => void;

export type ID_Selector = (dataRow: Data_Row) => Data_Row_ID;

export type Prop_Selector = (dataRow: Data_Row, columnDef: Column_Def) => Prop_Value;

export type Column_Def = {
  key: string;
  title: string;
  width?: number;
  [key: string]: any;
};

export type Prop_Value = string | number;

export type Data_Row_ID = Prop_Value;

export type Data_Row = Record<string, unknown>;

export type Theme = {
  rowHeight: number;
  cellPadding: number;
  tableBorderColor: string;
  scrollbarThickness: number;
  scrollbarTrackMargin: number;
  scrollbarThumbColor: string;
  columnResizerOpacity: number;
  fontSize: string;
  fontFamily: string;
  fontColor: string;
  fontStyle: string;
  bodyFontStyle?: string;
  bodyFontColor?: string;
  headerFontColor?: string;
  headerFontStyle?: string;
  tableBackgroundColor?: string;
  bodyBackgroundColor?: string;
  headerBackgroundColor?: string;
  hoveredRowColor?: string;
  selectedRowColor: string;
  scrollbarTrackColor?: string;
  scrollbarThumbHoverColor?: string;
  scrollbarThumbPressedColor?: string;
  columnResizerColor: string;
};

export type GUI_Context = {
  container_el: HTMLDivElement;
  wrapper_el: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  font_metrics_canvas: HTMLCanvasElement;
  font_metrics_canvas_ctx: CanvasRenderingContext2D;

  update_function?: () => void;

  curr_mouse_x: number;
  curr_mouse_y: number;
  curr_mouse_buttons: number;
  prev_mouse_buttons: number;
  drag_anchor_x: number;
  drag_anchor_y: number;
  drag_start_x: number;
  drag_start_y: number;
  drag_distance_x: number;
  drag_distance_y: number;
  scroll_amount_x: number;
  scroll_amount_y: number;
  raf_id?: number;

  hot_widget: string | null;
  active_widget: string | null;

  mouse_down_handler: (event: MouseEvent) => void;
  mouse_up_handler: (event: MouseEvent) => void;
  mouse_move_handler: (event: MouseEvent) => void;
  wheel_handler: (event: WheelEvent) => void;
  visibility_change_handler: () => void;
};

export type Renderer = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  glyph_atlas: Glyph_Atlas;
  hline_canvas: HTMLCanvasElement;
  vline_canvas: HTMLCanvasElement;
  hline_canvas_ctx: CanvasRenderingContext2D;
  vline_canvas_ctx: CanvasRenderingContext2D;
  hline_color: string;
  vline_color: string;
  command_buffer: Draw_Command[];
};

export type Make_Renderer_Params = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  glyph_atlas_params?: {
    atlas_width?: number;
    atlas_height?: number;
  };
};

export type Glyph_Atlas = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cache: Map<string, Glyph_Atlas_Node>;
  root_node: Glyph_Atlas_Node;
};

export type Glyph_Atlas_Params = {
  atlas_width?: number;
  atlas_height?: number;
};

export type Glyph_Atlas_Node = {
  left: Glyph_Atlas_Node | null;
  right: Glyph_Atlas_Node | null;
  filled: boolean;
  width: number;
  height: number;
  metrics: Glyph_Metrics;
};

export type Glyph_Metrics = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  hshift: number;
  vshift: number;
  advance: number;
};

export type Base_Draw_Command = {
  type: string;
  x: number;
  y: number;
  opacity?: number;
  clip_region?: Path2D;
  sort_order?: number;
};

export type Line_Orientation = "horizontal" | "vertical";

export type Draw_Line_Command = Base_Draw_Command & {
  type: "line";
  orientation: Line_Orientation;
  length: number;
  color: string;
};

export type Draw_Rect_Command = Base_Draw_Command & {
  type: "rect";
  width: number;
  height: number;
  stroke_color?: string;
  stroke_width?: number;
  fill_color?: string;
};

export type Draw_Text_Command = Base_Draw_Command & {
  type: "text";
  font: string;
  text: string;
  max_width?: number;
  color: string;
};

export type Draw_Command = Draw_Line_Command | Draw_Rect_Command | Draw_Text_Command;

export type Mouse_Buttons = typeof MOUSE_BUTTONS;

export type Mouse_Button_Value = Mouse_Buttons[keyof Mouse_Buttons];

export type Size = {
  width: number;
  height: number;
};
