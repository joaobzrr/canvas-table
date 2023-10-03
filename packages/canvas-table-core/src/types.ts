import { LineRenderer } from "./LineRenderer";
import { TextRenderer } from "./TextRenderer";

export type CanvasTable = {
  canvas: HTMLCanvasElement;
  containerEl: HTMLElement;
  wrapperEl: HTMLDivElement;

  lineRenderer: LineRenderer;
  textRenderer: TextRenderer;

  bodyFont: Font;
  headerFont: Font;

  mouseDownHandler: (event: MouseEvent) => void;
  mouseUpHandler:   (event: MouseEvent) => void;
  mouseMoveHandler: (event: MouseEvent) => void;
  wheelHandler:     (event: WheelEvent) => void;

  columnStates: ColumnState[];
  dataRows:     DataRow[];

  theme: Theme;

  mainRectX:      number;
  mainRectY:      number;
  mainRectWidth:  number;
  mainRectHeight: number;

  bodyRectX:      number;
  bodyRectY:      number;
  bodyRectWidth:  number;
  bodyRectHeight: number;

  headerRectX: number;
  headerRectY: number;
  headerRectWidth: number;
  headerRectHeight: number;

  scrollX: number;
  scrollY: number;

  maxScrollX: number;
  maxScrollY: number;

  normScrollX: number;
  normScrollY: number;

  contentWidth:  number;
  contentHeight: number;

  scrollWidth:  number;
  scrollHeight: number;

  viewportWidth:  number;
  viewportHeight: number;

  normViewportWidth:  number;
  normViewportHeight: number;

  overflowX: boolean;
  overflowY: boolean;
  
  columnPositions: number[];
  columnLeft:  number;
  columnRight: number;

  rowPositions: number[];
  rowTop:      number;
  rowBottom:   number;

  hsbOuterX:      number;
  hsbOuterY:      number;
  hsbOuterWidth:  number;
  hsbOuterHeight: number;

  hsbInnerX:      number;
  hsbInnerY:      number;
  hsbInnerWidth:  number;
  hsbInnerHeight: number;

  hsbTrackX:      number;
  hsbTrackY:      number;
  hsbTrackWidth:  number;
  hsbTrackHeight: number;

  hsbThumbX:      number;
  hsbThumbY:      number;
  hsbThumbWidth:  number;
  hsbThumbHeight: number;

  hsbMaxThumbPos: number;

  hsbDragOffset: number;
  hsbIsDragging: boolean;

  vsbOuterX:      number;
  vsbOuterY:      number;
  vsbOuterWidth:  number;
  vsbOuterHeight: number;

  vsbInnerX:      number;
  vsbInnerY:      number;
  vsbInnerWidth:  number;
  vsbInnerHeight: number;

  vsbTrackX: number;
  vsbTrackY: number;
  vsbTrackWidth: number;
  vsbTrackHeight: number;

  vsbThumbX:      number;
  vsbThumbY:      number;
  vsbThumbWidth:  number;
  vsbThumbHeight: number;

  vsbMaxThumbPos: number;

  vsbDragOffset: number;
  vsbIsDragging: boolean;

  indexOfColumnWhoseResizerIsBeingHovered: number;
  indexOfColumnBeingResized: number;
}

export type CanvasTableParams = {
  container: string;
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  theme?: Partial<Theme>;
  size?: Size;
}

export type CanvasTableConfig = {
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  theme: Partial<Theme>;
  size: Size;
}

export type ColumnDef = {
  title: string;
  field: string;
  width?: number;
}

export type ColumnState = Omit<ColumnDef, "width"> & {
  width: number;
}

export type DataRow = Record<string, string>;

export type TableRanges = {
  columnLeft:  number;
  columnRight: number;
  rowTop:      number;
  rowBottom:   number;
}

export type Grid = {
  width: number;
  height: number;
}

export type GridPositions = {
  columns: number[];
  rows: number[];
}

export type TextData = {
  x: number;
  y: number;
  maxWidth: number;
  text: string;
}

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
  scrollbarTrackColor?: string;
  columnResizerColor?: string;
  bodyFontColor?: string;
  headerFontColor?: string;
}

export type GlyphAtlasOptions = {
  textureWidth?:  number;
  textureHeight?: number;
}

export type TextureNode = {
  rect: RectLike;
  left: TextureNode | null;
  right: TextureNode | null;
  filled: boolean;
  glyphData?: GlyphData;
}

export type GlyphData = {
  rect: RectLike;
  verticalShift: number;
}

export type Font = {
  family: string;
  size: number;
  style: FontStyle
  color: string;
}

export type FontStyle = "normal" | "bold" | "italic" | "both";

export type Size = {
  width:  number;
  height: number;
}

export type RectLike = {
  x: number;
  y: number;
  width:  number;
  height: number;
}

export type VectorLike = {
  x: number;
  y: number;
}

export type Overflow = {
  x: boolean;
  y: boolean;
}
