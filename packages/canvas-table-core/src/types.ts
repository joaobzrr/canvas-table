import { UiId } from "./lib/UiContext/types";

export type CreateCanvasTableParams = {
  container: string;
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  theme?: Theme;
  size?: Size;

  selectId?: IdSelector;
  selectProp?: PropSelector;

  onSelectRow?: SelectRowCallback;
  onEditCell?: EditCellCallback;
  onResizeColumn?: ColumnResizeCallback;
};

export type ConfigCanvasTableParams = Omit<CreateCanvasTableParams, "container">;

export type SelectRowCallback = (id: DataRowId, dataRow: DataRow) => void;

export type EditCellCallback = (key: string, value: string) => void;

export type ColumnResizeCallback = (key: string, width: number) => void;

export type IdSelector = (dataRow: DataRow) => DataRowId;

export type PropSelector = (dataRow: DataRow, key: string) => PropValue;

export type ColumnDef = {
  key: string;
  title: string;
  width?: number;
};

export type ColumnState = Omit<ColumnDef, "width"> & {
  width: number;
};

export type PropValue = string | number;

export type DataRowId = PropValue;

export type DataRow = Record<string, unknown>;

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
};

export type DraggableProps = {
  id: UiId;
  rect: Rect;
  color?: string;
  hotColor?: string;
  activeColor?: string;
  clipRegion?: Path2D;
  onDrag?: (id: UiId, pos: Vector) => void;
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

export type ColumnDefsChangeTableEvent = {
  type: "columnDefsChange";
  columnDefs: ColumnDef[];
};

export type DataRowsChangeTableEvent = {
  type: "dataRowsChange";
  dataRows: DataRow[];
};

export type ThemeChangeTableEvent = {
  type: "themeChange";
  theme: Theme;
};

export type SizeChangeTableEvent = {
  type: "sizeChange";
  size: Size;
};

export type TableEvent =
  | ColumnDefsChangeTableEvent
  | DataRowsChangeTableEvent
  | ThemeChangeTableEvent
  | SizeChangeTableEvent;
