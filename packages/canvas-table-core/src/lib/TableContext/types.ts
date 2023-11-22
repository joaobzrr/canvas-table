import { DataRow, DataRowId, Theme } from "../../types";
import { Layout } from "../Layout";

export type TableEvents = {
  themechange: (theme: Theme) => void;
  reflow: (layout: Layout) => void;
  resizecolumn: (key: string, width: number) => void;
  selrowchange: (id: DataRowId, dataRow: DataRow) => void;
};
