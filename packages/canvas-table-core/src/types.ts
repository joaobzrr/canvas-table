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

  mousePos: VectorLike;

  columnStates: ColumnState[];
  dataRows:     DataRow[];

  theme: Theme;

  mainRect: RectLike;
  bodyRect: RectLike;
  headerRect: RectLike;

  hsbOuterRect: RectLike;
  hsbInnerRect: RectLike;
  hsbTrackRect: RectLike;
  hsbThumbRect: RectLike;
  hsbMaxThumbPos: number;
  hsbDragOffset: number;
  hsbIsDragging: boolean;

  vsbOuterRect: RectLike;
  vsbInnerRect: RectLike;
  vsbTrackRect: RectLike;
  vsbThumbRect: RectLike;
  vsbDragOffset: number;
  vsbMaxThumbPos: number;
  vsbIsDragging: boolean;

  scrollPos:           VectorLike;
  maxScrollPos:        VectorLike;
  normalizedScrollPos: VectorLike;

  contentSize:            Size;
  gridSize:               Size;
  scrollSize:             Size;
  viewportSize:           Size;
  normalizedViewportSize: Size;

  overflowX: boolean;
  overflowY: boolean;

  tableRanges: TableRanges;

  rowPositions: number[];
  columnPositions: number[];
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
  pos: number;
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
