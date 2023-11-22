import { DataRowId } from "../../types";

export class TableState {
  columnWidths: number[];

  selectedRowId: DataRowId | null = null;

  constructor(columnWidths: number[]) {
    this.columnWidths = columnWidths;
  }
}
