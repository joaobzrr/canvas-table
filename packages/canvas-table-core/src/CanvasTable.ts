import { Controller } from "./Controller";
import { defaultTheme } from "./defaultTheme";
import { TableState } from "./lib/TableState";
import { Stage } from "./lib/Stage";
import { TableContext } from "./lib/TableContext";
import { shallowMerge } from "./utils";
import { DEFAULT_COLUMN_WIDTH } from "./constants";
import {
  CreateCanvasTableParams,
  ConfigCanvasTableParams,
  ColumnDef,
  DataRowId,
  PropValue
} from "./types";

export class CanvasTable {
  private tblctx: TableContext;

  constructor(params: CreateCanvasTableParams) {
    const {
      container,
      columnDefs,
      dataRows,
      theme: themeParam,
      size,
      selectId: selectIdParam,
      selectProp: selectPropParam,
      onResizeColumn,
      onSelectRow,
      ...rest
    } = params;

    const theme = themeParam ?? defaultTheme;
    const selectId = selectIdParam ?? ((row) => row.id as DataRowId);
    const selectProp = selectPropParam ?? ((row, key) => row[key] as PropValue);
    const props = {
      columnDefs,
      dataRows,
      theme,
      selectId,
      selectProp,
      onResizeColumn,
      onSelectRow,
      ...rest
    };

    const columnWidths = CanvasTable.calculateColumnWidths(columnDefs);
    const state = new TableState(columnWidths);

    const stage = new Stage(container, size);
    this.tblctx = new TableContext(props, state, stage);

    if (onResizeColumn) this.tblctx.on("resizecolumn", onResizeColumn);
    if (onSelectRow) this.tblctx.on("selrowchange", onSelectRow);

    const ct = new Controller(this.tblctx);
    const updateFn = ct.update.bind(ct);
    stage.setUpdateFunction(updateFn);
    stage.run();
  }

  private static calculateColumnWidths(columnDefs: ColumnDef[]) {
    const columnWidths = [];
    for (const { width } of columnDefs) {
      columnWidths.push(width ?? DEFAULT_COLUMN_WIDTH);
    }
    return columnWidths;
  }

  public config(params: Partial<ConfigCanvasTableParams>) {
    const { columnDefs, dataRows, theme, size, ...rest } = params;

    const { props, state, stage, layout } = this.tblctx;

    let shouldReflow = false;

    if (columnDefs && !Object.is(columnDefs, props.columnDefs)) {
      props.columnDefs = columnDefs;

      const columnWidths = CanvasTable.calculateColumnWidths(columnDefs);
      state.columnWidths = columnWidths;

      shouldReflow = true;
    }

    if (dataRows && !Object.is(dataRows, props.dataRows)) {
      props.dataRows = dataRows;
      shouldReflow = true;
    }

    if (theme && !Object.is(theme, props.theme)) {
      props.theme = theme;
      this.tblctx.emit("themechange", theme);
      shouldReflow = true;
    }

    const stageSize = stage.getSize();
    if (size && (size.width !== stageSize.width || size.height !== stageSize.height)) {
      stage.setSize(size);
      shouldReflow = true;
    }

    if (shouldReflow) {
      layout.reflow();
    }

    shallowMerge(this.tblctx.props, rest);
  }

  public cleanup() {
    this.tblctx.stage.cleanup();
  }
}
