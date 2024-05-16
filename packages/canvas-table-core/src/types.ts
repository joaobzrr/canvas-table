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
  fontSize: string;
  fontFamily: string;
  fontColor: string;
  fontStyle: string;
  bodyFontStyle?: string;
  bodyFontColor?: string;
  headFontColor?: string;
  headFontStyle?: string;

  tableBackgroundColor?: string;
  bodyBackgroundColor?: string;
  headBackgroundColor?: string;
  topRightCornerBackgroundColor?: string;
  bottomRightCornerBackgroundColor?: string;
  scrollbarBackgroundColor?: string;

  rowHeight: number;
  hoveredRowBackgroundColor?: string;
  selectedRowBackgroundColor: string;
  evenRowBackgroundColor?: string;
  oddRowBackgroundColor?: string;

  // @Note For now, these only serve as way to disable borders by specifying a width of zero.
  borderWidth: number;
  outerBorderWidth?: number;
  headBorderWidth?: number;
  rowBorderWidth?: number;
  columnBorderWidth?: number;

  borderColor: string;

  scrollbarThickness: number;
  scrollbarPadding: number;
  scrollbarThumbColor: string;
  scrollbarThumbHoverColor?: string;
  scrollbarThumbPressedColor?: string;

  columnResizerColor: string;
  columnResizerOpacity: number;

  cellPadding: number;
};
