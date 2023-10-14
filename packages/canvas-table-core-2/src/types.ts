import { LineRenderer } from "./LineRenderer";
import { TextRenderer } from "./TextRenderer";

export type CanvasTable = {
  uiContext: UiContext;

  rafId: number;

  columnStates: ColumnState[];
  dataRows: DataRow[];
  theme: Theme;

  scrollPos: Vector;
  indexOfColumnBeingResized: number;
}

export type CreateCanvasTableParams = {
  container: string;
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  theme?: Partial<Theme>;
  size?: Size;
}

export type SetCanvasTableParams = Partial<Omit<CreateCanvasTableParams, "container">>;

export type ColumnDef = {
  title: string;
  field: string;
  width?: number;
}

export type ColumnState = Omit<ColumnDef, "width"> & {
  width: number;
}

export type DataRow = Record<string, string>;

export type Theme = {
  rowHeight: number;
  cellPadding: number;
  tableBorderColor: string;
  scrollbarThickness: number;
  scrollbarTrackMargin: number;
  scrollbarThumbColor: string;
  columnResizerOpacity: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontStyle: FontStyle;
  bodyFontStyle?: FontStyle;
  headerFontStyle?: FontStyle;
  tableBackgroundColor?: string;
  bodyBackgroundColor?: string;
  headerBackgroundColor?: string;
  hoveredRowColor?: string;
  scrollbarTrackColor?: string;
  scrollbarThumbHoverColor?: string;
  scrollbarThumbPressedColor?: string;
  columnResizerColor: string;
  bodyFontColor?: string;
  headerFontColor?: string;
}

export type Font = {
  family: string;
  size: number;
  style: FontStyle
  color: string;
}

export type FontStyle = "normal" | "bold" | "italic" | "both";

export type UiContext = {
  canvas:      HTMLCanvasElement;
  containerEl: HTMLDivElement;
  wrapperEl:   HTMLDivElement;

  hot:    UiId | null;
  active: UiId | null;

  dragAnchorPosition:     Vector;
  mouseDragStartPosition: Vector;
  dragDistance:           Vector;

  currMousePosition: Vector;
  currMouseButtons: number;

  prevMousePosition: Vector;
  prevMouseButtons: number;

  renderQueue: Shape[];

  lineRenderer: LineRenderer;
  textRenderer: TextRenderer;

  onMouseDown: (event: MouseEvent) => void;
  onMouseUp:   (event: MouseEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onWheel:     (event: WheelEvent) => void;
}

export type UiId = {
  item:   string;
  index?: number;
}

export type DraggableProps = {
  rect: Rect;
  color?: string;
  hotColor?: string;
  activeColor?: string;
}

export type BaseShape = {
  type: string;
  x: number;
  y: number;
  opacity?: number;
  clipRegion?: Path2D;
  sortOrder?: number;
}

export type LineOrientation = "horizontal" | "vertical";

export type LineShape = BaseShape & {
  type: "line";
  orientation: LineOrientation;
  length: number;
  color: string;
}

export type RectShape = BaseShape & {
  type: "rect";
  width: number;
  height: number;
  color: string;
}

export type TextShape = BaseShape & {
  type: "text";
  font: Font;
  text: string;
  maxWidth?: number;
  ellipsis?: boolean;
}

export type Shape =
  LineShape
  | RectShape
  | TextShape;

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Vector = {
  x: number;
  y: number;
}

export type Size = {
  width: number;
  height: number;
}

export type CreateUiContextParams = {
  container: string;
  size?: Size;
}

export type Layout = {
  tableWidth:  number;
  tableHeight: number;

  bodyWidth:  number;
  bodyHeight: number;

  scrollWidth:  number;
  scrollHeight: number;

  contentWidth:  number;
  contentHeight: number;

  gridWidth:  number;
  gridHeight: number;

  maxScrollX: number;
  maxScrollY: number;

  hsbRect:      Rect;
  hsbTrackRect: Rect;

  vsbRect: Rect;
  vsbTrackRect: Rect;

  overflowX: boolean;
  overflowY: boolean;
}

export type Viewport = {
  columnStart: number;
  columnEnd: number;
  columnPositions: Map<number, number>;

  rowStart: number;
  rowEnd: number;
  rowPositions: Map<number, number>;

  tableEndPosition: number;
}
