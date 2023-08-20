import { Vector } from "./Vector";
import {
  ColumnState,
  DataRow,
  Dimensions,
  TableConfig,
  TableRanges,
  Theme,
  VectorLike
} from "../types";

export class TableState {
  private columnStates = [] as ColumnState[];
  private dataRows = [] as DataRow[];

  private scrollPosition = { x: 0, y: 0 };
  private normalizedScrollPosition = { x: 0, y: 0 };
  private maximumScrollPosition = { x: 0, y: 0 };

  private tableDimensions = { width: 1, height: 1 };
  private scrollDimensions = { width: 1, height: 1 };
  private viewportDimensions = { width: 1, height: 1 };

  private tableRanges = { columnLeft: 0, columnRight: 0, rowTop: 0, rowBottom: 0 }

  private theme!: Theme;

  constructor(config: TableConfig) {
    this.config(config);
  }

  public config(config: TableConfig) {
    const columnStates = [];
    let total = 0;
    for (const columnDef of config.columnDefs) {
      columnStates.push({ ...columnDef, position: total });
      total += columnDef.width;
    }
    this.columnStates = columnStates;
    this.dataRows = config.dataRows;
    this.theme = config.theme;

    this.tableDimensions = this.calculateTableDimensions();
    this.tableRanges = this.calculateTableRanges();
  }

  public getTheme() {
    return { ...this.theme };
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
    this.scrollDimensions = this.calculateScrollDimensions();
    this.maximumScrollPosition = this.calculateMaximumScrollPosition();
    this.normalizedScrollPosition = this.calculateNormalizedScrollPosition();
    this.tableRanges = this.calculateTableRanges();
  }

  public getDataRow(rowIndex: number) {
    const dataRow = this.dataRows[rowIndex];
    if (!dataRow) {
      throw new Error("Index out of bounds");
    }
    return dataRow;
  }

  public getScrollPosition() {
    return { ...this.scrollPosition };
  }

  public setScrollPosition(scrollPosition: VectorLike) {
    this.scrollPosition = new Vector(scrollPosition)
      .clamp(Vector.zero(), new Vector(this.maximumScrollPosition))
      .data();

    this.normalizedScrollPosition = this.calculateNormalizedScrollPosition();
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
    this.viewportDimensions = { ...viewportDimensions };
    this.scrollDimensions = this.calculateScrollDimensions();
    this.maximumScrollPosition = this.calculateMaximumScrollPosition();

    this.setScrollPosition(this.scrollPosition);
  }

  public getTableRanges() {
    return { ...this.tableRanges };
  }

  public scrollToViewportPosition(position: VectorLike) {
    return new Vector(position).sub(this.scrollPosition);
  }

  private calculateTableRanges(): TableRanges {
    if (!this.theme) {
      throw new Error("A theme has not been set");
    }

    const { x: scrollLeft, y: scrollTop } = this.scrollPosition;
    const { width: viewportWidth, height: viewportHeight } = this.viewportDimensions;
    const { rowHeight } = this.theme;

    const scrollRight = scrollLeft + viewportWidth;
    const scrollBottom = scrollTop + viewportHeight;

    let columnLeft = this.findColumnIndexAtXCoordinate(scrollLeft);
    if (columnLeft === -1) columnLeft = 0;

    let columnRight = this.findColumnIndexAtXCoordinate(scrollRight, columnLeft);
    columnRight = columnRight !== -1 ? columnRight + 1 : this.numOfCols;

    const rowTop = Math.floor(scrollTop / rowHeight);
    const rowBottom = Math.min(Math.ceil(scrollBottom / rowHeight), this.numOfRows);

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

    const x = scrollWidth - viewportWidth;
    const y = scrollHeight - viewportHeight;

    return { x, y };
  }

  private calculateTableDimensions() {
    if (!this.theme) {
      throw new Error("A theme has not been set");
    }

    const lastColumnState = this.columnStates[this.numOfCols - 1];
    const width = lastColumnState.position + lastColumnState.width;
    const height = this.numOfRows * this.theme.rowHeight;
    return { width, height };
  }

  private calculateScrollDimensions() {
    const { width: tableWidth, height: tableHeight } = this.tableDimensions;
    const { width: viewportWidth, height: viewportHeight } = this.viewportDimensions;

    const width = Math.max(tableWidth, viewportWidth);
    const height = Math.max(tableHeight, viewportHeight);

    return { width, height };
  }

  private calculateNormalizedScrollPosition() {
    const x = this.maximumScrollPosition.x > 0
      ? this.scrollPosition.x / this.maximumScrollPosition.x
      : 0;

    const y = this.maximumScrollPosition.y > 0
      ? this.scrollPosition.y / this.maximumScrollPosition.y
      : 0;

    return new Vector(x, y).data();
  }

  get numOfRows() {
    return this.dataRows.length;
  }

  get numOfCols() {
    return this.columnStates.length;
  }
}
