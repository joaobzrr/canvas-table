import { UiId } from "./lib/UiContext/types";

export type CreateCanvasTableParams = {
  container: string;
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  theme?: Partial<Theme>;
  size?: Size;
  selectId?: IdSelector;
  onSelect?: SelectRowCallback;
}

export type SelectRowCallback = (id: DataRowId, dataRow: DataRow) => void;

export type IdSelector = (dataRow: DataRow) => DataRowId;

export type SetCanvasTableParams = Partial<Omit<CreateCanvasTableParams, "container">>;

export type ColumnDef = {
  title: string;
  field: string;
  width?: number;
}

export type ColumnState = Omit<ColumnDef, "width"> & {
  width: number;
}

export type DataRowId = DataRowValue;

export type DataRowValue = string | number;

export type DataRow = Record<string, DataRowValue>;

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

export type DraggableProps = {
  id: UiId;
  rect: Rect;
  color?: string;
  hotColor?: string;
  activeColor?: string;
  clipRegion?: Path2D;
  onDrag?: (id: UiId, pos: Vector) => void;
}

export type RowProps = {
  id: UiId;
  rect: Rect;
  color?: string;
  hotColor?: string;
  activeColor?: string;
  clipRegion?: Path2D;
}

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
  hsbThumbRect: Rect;
  hsbThumbMinX: number;
  hsbThumbMaxX: number;

  vsbRect: Rect;
  vsbTrackRect: Rect;
  vsbThumbRect: Rect;
  vsbThumbMinY: number;
  vsbThumbMaxY: number;

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
}

export type FrameState = {
  layout:   Layout;
  viewport: Viewport;
}
