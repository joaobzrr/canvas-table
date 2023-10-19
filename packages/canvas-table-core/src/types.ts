import { TextRenderer } from "text-renderer";
import { LineRenderer } from "./LineRenderer";

export type CreateCanvasTableParams = {
  container: string;
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  theme?: Partial<Theme>;
  size?: Size;
  onSelect?: (id: DataRowValue, dataRow: DataRow) => void;
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

export type DataRowValue = string | number;

export type DataRow = {
  id: DataRowValue;
  [name: string]: DataRowValue;
};

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
  bodyFontColor?: string;
  headerFontColor?: string;
}

export type UiContext = {
  canvas:      HTMLCanvasElement;
  containerEl: HTMLDivElement;
  wrapperEl:   HTMLDivElement;

  hot:    UiId | null;
  active: UiId | null;

  dragAnchorPosition:     Vector;
  mouseDragStartPosition: Vector;
  dragDistance:           Vector;

  currentMousePosition: Vector;
  currentMouseButtons: number;

  previousMousePosition: Vector;
  previousMouseButtons: number;

  renderQueue: Shape[];

  lineRenderer: LineRenderer;
  textRenderer: TextRenderer;

  onMouseDown: (event: MouseEvent) => void;
  onMouseUp:   (event: MouseEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onWheel:     (event: WheelEvent) => void;
}

export type UiId = {
  name:   string;
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
  color: string;
  opacity?: number;
  clipRegion?: Path2D;
  sortOrder?: number;
}

export type LineOrientation = "horizontal" | "vertical";

export type LineShape = BaseShape & {
  type: "line";
  orientation: LineOrientation;
  length: number;
}

export type RectShape = BaseShape & {
  type: "rect";
  width: number;
  height: number;
}

export type TextShape = BaseShape & {
  type: "text";
  font: string;
  text: string;
  maxWidth?: number;
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
  tableRect:  Rect;
  bodyRect:   Rect;
  headerRect: Rect;

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

export type FrameState = {
  layout:   Layout;
  viewport: Viewport;
}

export type GlyphAtlasOptions = {
  textureWidth?:  number;
  textureHeight?: number;
}

export type TextureNode = {
  rect: Rect;
  left: TextureNode | null;
  right: TextureNode | null;
  filled: boolean;
  glyphData?: GlyphData;
}

export type GlyphData = {
  rect: Rect;
  verticalShift: number;
}
