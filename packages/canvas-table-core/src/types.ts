import { UiId } from "./lib/UiContext/types";

export type CreateCanvasTableParams = Omit<TableProps, "selectId" | "selectProp"> & {
  container: string;
  theme?: Theme;
  size?: Size;
  selectId?: IdSelector;
  selectProp?: PropSelector;
};

export type ConfigCanvasTableParams = Omit<CreateCanvasTableParams, "container">;

export type TableProps = {
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  selectId: IdSelector;
  selectProp: PropSelector;
  onSelectRow?: SelectRowCallback;
  onEditCell?: EditCellCallback;
  onResizeColumn?: ColumnResizeCallback;
};

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
  selectedCellBorderColor: string;
  selectedCellBackgroundColor?: string;
};

export type DraggableProps = {
  id: UiId;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  hotColor?: string;
  activeColor?: string;
  clipRegion?: Path2D;
  sortOrder?: number;
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
