import { Platform } from "./Platform";
import { Gui } from "./Gui";
import { TableState } from "./TableState";
import { defaultTheme } from "./defaultTheme";
import { shallowMerge } from "./utils";
import {
  CanvasTableProps,
  CanvasTableParams,
  ColumnDef,
  DataRow,
  DataRowId,
  PropValue,
  IdSelector,
  PropSelector
} from "./types";

export class CanvasTable {
  private state: TableState;
  private gui: Gui;

  private batchedProps: Partial<CanvasTableProps>[] = [];

  constructor(params: CanvasTableParams) {
    const { container, ...rest } = params;

    const platform = new Platform(container);
    this.state = new TableState(platform, CanvasTable.createProps(rest));
    this.gui = new Gui(platform, this.state);

    platform.updateFunction = this.update.bind(this);
    platform.startAnimation();
  }

  private static createProps(params: Omit<CanvasTableParams, 'container'>) {
    const theme = params.theme ?? defaultTheme;

    let selectId = params.selectId as IdSelector;
    if (!params.selectId) {
      selectId = CanvasTable.defaultIdSelector;
    }

    let selectProp = params.selectProp as PropSelector;
    if (!params.selectProp) {
      selectProp = CanvasTable.defaultPropSelector; 
    }

    return { ...params, theme, selectId, selectProp };
  }

  private static defaultIdSelector(row: DataRow) {
    return row.id as DataRowId;
  }

  private static defaultPropSelector(row: DataRow, columnDef: ColumnDef) {
    return row[columnDef.key] as PropValue;
  }

  private update() {
    const props = this.mergeBatchedProps();
    this.state = this.state.update(props);
    this.gui.update(this.state);
  }

  private mergeBatchedProps() {
    const props = {} as Partial<CanvasTableProps>;
    while (this.batchedProps.length > 0) {
      shallowMerge(props, this.batchedProps.shift());
    }
    return props;
  }

  public config(props: Partial<CanvasTableProps>) {
    this.batchedProps.push(props);
  }

  public destroy() {
    this.gui.destroy();
  }
}
