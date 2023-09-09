export type TableState = {
  columnStates: ColumnState[];
  dataRows: DataRow[];

  scrollPos: VectorLike;
  maxScrollPos: VectorLike;
  normalizedScrollPos: VectorLike;

  mousePos: VectorLike;

  tableSize: Size;
  scrollSize: Size;
  viewportSize: Size;
  normalizedViewportSize: Size;

  mainArea: RectLike;
  bodyArea: RectLike;

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
  width: number;
}

export type ColumnState = ColumnDef & {
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
  scrollBarTrackColor?: string;
  scrollBarThumbColor: string;
  columnResizerColor?: string;
  columnResizerOpacity: number;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
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
  size: string;
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
