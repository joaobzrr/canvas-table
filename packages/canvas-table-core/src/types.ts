export type TableState = {
  columnStates: ColumnState[];
  dataRows: DataRow[];

  scrollPos: VectorLike;
  maxScrollPos: VectorLike;
  normalizedScrollPos: VectorLike;

  tableSize: Size;
  scrollSize: Size;
  viewportSize: Size;
  normalizedViewportSize: Size;

  mousePos: VectorLike;

  mainArea: RectLike;
  bodyArea: RectLike;
  headerArea: RectLike;
  hsbOuterArea: RectLike;
  hsbInnerArea: RectLike;
  vsbOuterArea: RectLike;
  vsbInnerArea: RectLike;

  overflow: Overflow;

  tableRanges: TableRanges;
}

export type CanvasTableConfig = {
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  theme: Partial<Theme>;
  size: Size;
}

export type CanvasTableParams =
Omit<CanvasTableConfig, "theme" | "size"> & {
  container: string;
  theme?: Partial<Theme>;
  size?: Size;
}

export type CreateViewParams = Omit<CanvasTableParams, "container">;

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

export type Theme = {
  rowHeight: number;
  cellPadding: number;
  tableBorderColor: string;
  scrollBarThickness: number;
  scrollBarTrackMargin: number;
  scrollBarThumbColor: string;
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
  scrollBarTrackColor?: string;
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