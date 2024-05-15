export type CanvasTableParams = Omit<CanvasTableProps, 'theme' | 'selectId' | 'selectProp'> & {
  container: string;
  theme?: Theme;
  selectId?: IdSelector;
  selectProp?: PropSelector;
};

export type CanvasTableProps = {
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
  theme: Theme;
  selectedRowId?: DataRowId;
  selectId: IdSelector;
  selectProp: PropSelector;
  onSelectRow?: SelectRowCallback;
  onResizeColumn?: ColumnResizeCallback;
};

export type SelectRowCallback = (id: DataRowId, dataRow: DataRow) => void;

export type ColumnResizeCallback = (key: string, index: number, width: number) => void;

export type IdSelector = (dataRow: DataRow) => DataRowId;

export type PropSelector = (dataRow: DataRow, columnDef: ColumnDef) => PropValue;

export type ColumnDef = {
  key: string;
  title: string;
  width?: number;
  [key: string]: unknown;
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
  evenRowColor?: string;
  oddRowColor?: string;
  scrollbarTrackColor?: string;
  scrollbarThumbHoverColor?: string;
  scrollbarThumbPressedColor?: string;
  columnResizerColor: string;
};
