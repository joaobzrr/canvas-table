import { Vector } from "./Vector";
import {
  ColumnDef,
  ColumnState,
  DataRow,
  Dimensions,
  TableRanges,
  VectorLike
} from "./types";

export class TableState {
  columnStates = [] as ColumnState[];
  dataRows = [] as DataRow[];

  scrollPosition           = { x: 0, y: 0 };
  normalizedScrollPosition = { x: 0, y: 0 };
  maximumScrollPosition    = { x: 0, y: 0 };

  tableDimensions    = { width: 1, height: 1 };
  scrollDimensions   = { width: 1, height: 1 };
  viewportDimensions = { width: 1, height: 1 };

  tableRanges = { columnLeft: 0, columnRight: 0, rowTop: 0, rowBottom: 0 }

  rowHeight = 1;

  get numOfRows() {
    return this.dataRows.length;
  }

  get numOfCols() {
    return this.columnStates.length;
  }

  public setTableData(columnDefs: ColumnDef[], dataRows: DataRow[]) {
    const columnStates = [];
    let total = 0;
    for (const columnDef of columnDefs) {
      columnStates.push({ ...columnDef, position: total });
      total += columnDef.width;
    }

    this.columnStates = columnStates;
    this.dataRows = dataRows;

    this.tableDimensions = this.calculateTableDimensions();
    this.tableRanges = this.calculateTableRanges();
  }

  public getColumnState(columnIndex: number) {
    const columnState = this.columnStates[columnIndex];
    if (!columnState) {
      throw new Error("Index out of bounds");
    }
    return columnState;
  }

  public setColumnWidth(columnIndex: number, width: number) {
    const columnToResize = this.getColumnState(columnIndex);
    columnToResize.width = width;

      // @Note Recalculate the position of columns after the one being resized
    let total = columnToResize.position + columnToResize.width;
    for (let j = columnIndex + 1; j < this.numOfCols; j++) {
      const columnState = this.getColumnState(j);
      columnState.position = total;
      total += columnState.width;
    }

    this.tableDimensions = this.calculateTableDimensions();
    this.tableRanges = this.calculateTableRanges();
  }

  public getDataRow(rowIndex: number) {
    const dataRow = this.dataRows[rowIndex];
    if (!dataRow) {
      throw new Error("Index out of bounds");
    }
    return dataRow;
  }

  public getRowHeight() {
    return this.rowHeight;
  }

  public setRowHeight(rowHeight: number) {
    this.rowHeight = rowHeight;
  }

  public getScrollPosition() {
    return { ...this.scrollPosition };
  }

  public setScrollPosition(scrollPosition: VectorLike) {
    this.scrollPosition = new Vector(scrollPosition)
      .clamp(Vector.zero(), new Vector(this.maximumScrollPosition))
      .data();

    this.normalizedScrollPosition = this.calculateNormalizedScrollPosition(this.scrollPosition);
    this.tableRanges = this.calculateTableRanges();
  }

  public getNormalizedScrollPosition() {
    return { ...this.normalizedScrollPosition };
  }

  public getMaximumScrollPosition() {
    return { ...this.maximumScrollPosition };
  }

  public getScrollDimensions() {
    return { ...this.scrollDimensions };
  }

  public getTableDimensions() {
    return { ...this.tableDimensions };
  }

  public getViewportDimensions() {
    return { ...this.viewportDimensions };
  }

  public setViewportDimensions(viewportDimensions: Dimensions) {
    this.viewportDimensions =  { ...viewportDimensions };
    this.scrollDimensions = this.calculateScrollDimensions();
    this.maximumScrollPosition = this.calculateMaximumScrollPosition();

    this.scrollPosition = new Vector(this.scrollPosition)
      .min(new Vector(this.maximumScrollPosition))
      .data();

    this.tableRanges = this.calculateTableRanges();
  }

  public getTableRanges() {
    return { ...this.tableRanges };
  }

  private calculateTableRanges(): TableRanges {
    const { x: scrollLeft, y: scrollTop } = this.scrollPosition;
    const { width: viewportWidth, height: viewportHeight } = this.viewportDimensions;

    const scrollRight  = scrollLeft + viewportWidth;
    const scrollBottom = scrollTop  + viewportHeight;

    let columnLeft = this.findColumnIndexAtXCoordinate(scrollLeft);
    if (columnLeft === -1) columnLeft = 0;

    let columnRight = this.findColumnIndexAtXCoordinate(scrollRight, columnLeft);
    columnRight = columnRight !== -1 ? columnRight + 1 : this.numOfCols;

    const rowTop    = Math.floor(scrollTop / this.rowHeight);
    const rowBottom = Math.min(Math.ceil(scrollBottom / this.rowHeight), this.numOfRows);

    return {
      columnLeft,
      columnRight,
      rowTop,
      rowBottom
    };
  }

  private findColumnIndexAtXCoordinate(x: number, start: number = 0) {
    if (start < 0 || start >= this.numOfCols) {
      throw new Error("Index is out of bounds");
    }

    const max = this.tableDimensions.width;
    if (x >= max) return -1;
    if (x < 0) return -1;
    if (x == 0) return 0;

    let index = start;
    for (; index < this.numOfCols; index++) {
      const columnState = this.columnStates[index];
      if (columnState.position >= x) {
        break;
      }
    }

    return index - 1;
  }

  private calculateMaximumScrollPosition() {
    const { width: scrollWidth, height: scrollHeight } = this.scrollDimensions
    const { width: viewportWidth, height: viewportHeight } = this.viewportDimensions;

    const x = scrollWidth  - viewportWidth;
    const y = scrollHeight - viewportHeight;

    return { x, y };
  }

  private calculateTableDimensions() {
    const lastColumnState = this.columnStates[this.numOfCols - 1];
    const width = lastColumnState.position + lastColumnState.width;

    const height = this.numOfRows * this.rowHeight;

    return { width, height };
  }

  private calculateScrollDimensions() {
    const { width: tableWidth, height: tableHeight } = this.tableDimensions;
    const { width: viewportWidth, height: viewportHeight } = this.viewportDimensions;

    const width  = Math.max(tableWidth, viewportWidth);
    const height = Math.max(tableHeight, viewportHeight);
    
    return { width, height };
  }

  private calculateNormalizedScrollPosition(scrollPosition: VectorLike) {
    return new Vector(scrollPosition)
      .div(this.maximumScrollPosition)
      .data();
  }
}
