import { DataRow, DataRowId, Theme, Vector } from "../../types";
import { Layout } from "../Layout";

export type TableEvents = {
  reflow: (layout: Layout) => void;
  scroll: (scrollPos: Vector) => void;
  resizecolumn: (key: string, width: number) => void;
  selrowchange: (id: DataRowId, dataRow: DataRow) => void;
  dblclickcell: (rowIndex: number, colIndex: number) => void;
  themechange: (theme: Theme) => void;
};
