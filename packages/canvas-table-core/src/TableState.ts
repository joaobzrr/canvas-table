import * as Layout from "./Layout";
import { CanvasTableProps } from "./types";

export class TableState {
  props: CanvasTableProps;
  layout: Layout.Layout;

  headerAreaClipRegion!: Path2D;
  bodyAreaClipRegion!: Path2D;

  mouseRow = -1;

  constructor(props: CanvasTableProps, layout?: Layout.Layout) {
    this.props = props;
    this.layout = layout ?? Layout.makeLayout(props.columnDefs);

    this.updateClipRegions();
  }

  private applyChanges(props: Partial<CanvasTableProps>, tableWidth: number, tableHeight: number) {
    const newState = this.copy();

    newState.layout.tableWidth = tableWidth;
    newState.layout.tableHeight = tableHeight;

    if (props.columnDefs) {
      newState.props.columnDefs = props.columnDefs;
      newState.layout.columnWidths = Layout.calculateColumnWidths(props.columnDefs);
    }

    if (props.dataRows) {
      newState.props.dataRows = props.dataRows;
    }

    if (props.theme) {
      newState.props.theme = props.theme;
    }


    if ('selectedRowId' in props) {
      newState.props.selectedRowId = props.selectedRowId;
    }

    newState.props.selectId = props.selectId ?? this.props.selectId;
    newState.props.selectProp = props.selectProp ?? this.props.selectProp;
    newState.props.onSelectRow = props.onSelectRow ?? this.props.onSelectRow;
    newState.props.onResizeColumn = props.onResizeColumn ?? this.props.onResizeColumn;

    return newState;
  }

  private updateClipRegions() {
    this.bodyAreaClipRegion = new Path2D();
    this.bodyAreaClipRegion.rect(
      this.layout.bodyAreaX,
      this.layout.bodyAreaY,
      this.layout.bodyAreaWidth,
      this.layout.bodyAreaHeight);

    this.headerAreaClipRegion = new Path2D();
    this.headerAreaClipRegion.rect(
      this.layout.headerAreaX,
      this.layout.headerAreaY,
      this.layout.headerAreaWidth,
      this.layout.headerAreaHeight);
  }

  public copy() {
    const props  = Object.assign({}, this.props);
    const layout = Object.assign({}, this.layout);
    return new TableState(props, layout);
  }

  public update(
    props: Partial<CanvasTableProps>,
    tableWidth: number,
    tableHeight: number,
    scrollAmountX: number,
    scrollAmountY: number
  ) {
    const newState = this.applyChanges(props, tableWidth, tableHeight);

    const tableSizeChanged = newState.layout.tableWidth !== this.layout.tableWidth || newState.layout.tableHeight !== this.layout.tableHeight;

    const columnDefsChanged = !Object.is(newState.props.columnDefs, this.props.columnDefs);
    const dataRowsChanged   = !Object.is(newState.props.dataRows,   this.props.dataRows);
    const themeChanged      = !Object.is(newState.props.theme,      this.props.theme);

    const shouldRefreshLayout = tableSizeChanged || columnDefsChanged || dataRowsChanged || themeChanged;
    if (shouldRefreshLayout) {
      newState.refreshLayout();
    }

    Layout.updateScrollPos(newState.layout, scrollAmountX, scrollAmountY);
    const scrollPosChanged = newState.layout.scrollX !== this.layout.scrollX || newState.layout.scrollY !== this.layout.scrollY;
    if (shouldRefreshLayout || scrollPosChanged) {
      newState.refreshViewport();
    }

    return newState;
  }

  public refreshLayout() {
    const { dataRows, theme: { rowHeight, scrollbarThickness, scrollbarTrackMargin } } = this.props;
    Layout.refreshLayout(this.layout, dataRows.length, rowHeight, scrollbarThickness, scrollbarTrackMargin);
  } 

  public refreshViewport() {
    const { dataRows, theme: { rowHeight } } = this.props;
    Layout.refreshViewport(this.layout, dataRows.length, rowHeight);

    this.updateClipRegions();
  }

  public resizeColumn(columnIndex: number, columnWidth: number) {
    this.layout.columnWidths[columnIndex] = columnWidth;

    this.refreshLayout();

    this.layout.scrollX = Math.min(this.layout.scrollX, this.layout.maxScrollX);
    this.layout.scrollY = Math.min(this.layout.scrollY, this.layout.maxScrollY);

    this.refreshViewport();

    this.layout.hsbThumbX = Layout.calculateHorizontalScrollbarThumbX(this.layout);
    this.layout.vsbThumbY = Layout.calculateVerticalScrollbarThumbY(this.layout);

    const columnDef = this.props.columnDefs[columnIndex];
    this.props.onResizeColumn?.(columnDef.key, columnIndex, columnWidth);
  }  

  public *columnRange(start = 0) {
    for (let j = this.layout.columnStart + start; j < this.layout.columnEnd; j++) {
      yield j;
    }
  }

  public *rowRange(start = 0) {
    for (let i = this.layout.rowStart + start; i < this.layout.rowEnd; i++) {
      yield i;
    }
  }

  public calculateResizerScrollX(columnIndex: number) {
    return Layout.calculateResizerScrollX(this.layout, columnIndex);
  }

  public calculateColumnScrollX(columnIndex: number) {
    return Layout.calculateColumnScrollX(this.layout, columnIndex);
  }

  public calculateRowScrollY(rowIndex: number) {
    const { theme: { rowHeight } } = this.props;
    return Layout.calculateRowScrollY(rowIndex, rowHeight);
  }

  public calculateColumnScreenX(columnIndex: number) {
    return Layout.calculateColumnScreenX(this.layout, columnIndex);
  }

  public calculateRowScreenY(rowIndex: number) {
    const { theme: { rowHeight } } = this.props;
    return Layout.calculateRowScreenY(this.layout, rowIndex, rowHeight);
  }

  public scrollToScreenX(scrollX: number) {
    return Layout.scrollToScreenX(this.layout, scrollX);
  }

  public scrollToScreenY(scrollY: number) {
    return Layout.scrollToScreenY(this.layout, scrollY);
  }

  public screenToScrollX(scrollX: number) {
    return Layout.screenToScrollX(this.layout, scrollX);
  }

  public screenToScrollY(scrollY: number) {
    return Layout.screenToScrollY(this.layout, scrollY);
  }

  public calculateScrollX(hsbThumbX: number) {
    return Layout.calculateScrollX(this.layout, hsbThumbX);
  }

  public calculateScrollY(hsbThumbY: number) {
    return Layout.calculateScrollY(this.layout, hsbThumbY);
  }
}
