export type VectorLike = {
  x: number;
  y: number;
}

export type RectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Dimensions = {
  width:  number;
  height: number;
}

export type ColumnDef = {
  title: string;
  field: string;
  width: number;
}

export type ColumnState = ColumnDef & {
  position: number;
}

export type DataRow = Record<string, string>;

export type Theme = {
  rowHeight: number;
  cellPadding: number;
  tableBorderColor: string;
  scrollBarThickness: number;
  scrollBarTrackMargin: number;
  scrollBarTrackColor: string;
  scrollBarThumbColor: string;
  fontSize: string;
  fontColor: string;
  fontFamily: string;
}

export type TableRanges = {
  columnLeft:  number;
  columnRight: number;
  rowTop:      number;
  rowBottom:   number;
}

export type CanvasTableOptions = {
  container:  string;
  columnDefs: ColumnDef[];
  dataRows:   DataRow[];
  theme?:     Theme;
}

export type FontSpecifier = {
  fontFamily:  string;
  fontSize:    string;
  fontStyle?:  string;
  fontWeight?: string;
}

export type FontConfig = {
  configName:  string;
  fontStyle?:  string;
  fontWeight?: string;
};

export type Nullable<T> = T | undefined | null;
