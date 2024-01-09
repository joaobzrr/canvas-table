import { UI_Context, UI_ID } from "./ui_context";
import { MOUSE_BUTTONS } from "./constants";

export type Canvas_Table = {
  tblctx: Table_Context;
  renderer: Renderer;
  ui: UI_Context;
  container_el: HTMLDivElement;
  wrapper_el: HTMLDivElement;
  canvas: HTMLCanvasElement;
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
  unmerged_props?: Partial<Table_Props>;
  mouse_down_handler: (event: MouseEvent) => void;
  mouse_up_handler: (event: MouseEvent) => void;
  mouse_move_handler: (event: MouseEvent) => void;
  wheel_handler: (event: WheelEvent) => void;
};

export type Table_State = {
  tblctx: Table_Context;
  props: Table_Props;
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
  actual_body_width: number;
  actual_body_height: number;
  body_x: number;
  body_y: number;
  body_width: number;
  body_height: number;
  scroll_x: number;
  scroll_y: number;
  scroll_width: number;
  scroll_height: number;
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
  vsb_traack_height: number;
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
  column_widths: number[];
  canonical_column_positions: number[];
  selected_row_id: Data_Row_ID | null;
};

export type Table_Context = {
  canvas: HTMLCanvasElement;
  state: Table_State;
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

export type Renderer = {
  glyph_atlas_canvas: HTMLCanvasElement;
  glyph_atlas_cache: Map<string, Glyph_Atlas_Node>;
  glyph_atlas_root_node: Glyph_Atlas_Node;
  font: string;
  text_color: string;
  hline_canvas: HTMLCanvasElement;
  vline_canvas: HTMLCanvasElement;
  line_color: string;
  render_queue: Shape[];
};

export type Make_Renderer_Params = {
  glyph_atlas_width?: number;
  glyph_atlas_height?: number;
  font?: string;
  text_color?: string;
  line_color?: string;
};

export type Glyph_Atlas_Params = {
  atlas_width?: number;
  atlas_height?: number;
};

export type Glyph_Atlas_Node = {
  left: Glyph_Atlas_Node | null;
  right: Glyph_Atlas_Node | null;
  filled: boolean;
  bin_width: number;
  bin_height: number;
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

export type Base_Shape = {
  type: string;
  x: number;
  y: number;
  opacity?: number;
  clip_region?: Path2D;
  sort_order?: number;
};

export type Line_Orientation = "horizontal" | "vertical";

export type Line_Shape = Base_Shape & {
  type: "line";
  orientation: Line_Orientation;
  length: number;
  color: string;
};

export type Rect_Shape = Base_Shape & {
  type: "rect";
  width: number;
  height: number;
  stroke_color?: string;
  stroke_width?: number;
  fill_color?: string;
};

export type Text_Shape = Base_Shape & {
  type: "text";
  font: string;
  text: string;
  max_width?: number;
  color: string;
};

export type Shape = Line_Shape | Rect_Shape | Text_Shape;

export type Mouse_Buttons = typeof MOUSE_BUTTONS;

export type Mouse_Button_Value = Mouse_Buttons[keyof Mouse_Buttons];

export type Draggable_Props = {
  id: UI_ID;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  hotColor?: string;
  activeColor?: string;
  clipRegion?: Path2D;
  sortOrder?: number;
  onDrag?: (id: UI_ID, pos: Vector) => void;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Vector = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};
