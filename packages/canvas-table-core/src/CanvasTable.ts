import { Platform } from './Platform';
import { Gui } from './Gui';
import { TableState } from './TableState';
import { defaultTheme } from './defaultTheme';
import { shallowMerge } from './utils';
import type {
  CanvasTableProps,
  CanvasTableParams,
  ColumnDef,
  DataRow,
  DataRowId,
  PropValue,
  IdSelector,
  PropSelector,
} from './types';

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
      selectId = defaultIdSelector;
    }

    let selectProp = params.selectProp as PropSelector;
    if (!params.selectProp) {
      selectProp = defaultPropSelector;
    }

    return { ...params, theme, selectId, selectProp };
  }
  private update() {
    const props = this.mergeBatchedProps();
    this.state = this.state.update(props);
    this.gui.update(this.state);
  }

  private mergeBatchedProps() {
    return shallowMerge<Partial<CanvasTableProps>>(...this.batchedProps);
  }

  public config(props: Partial<CanvasTableProps>) {
    this.batchedProps.push(props);
  }

  public destroy() {
    this.gui.destroy();
  }
}

const defaultIdSelector = (row: DataRow) => {
  return row.id as DataRowId;
};

const defaultPropSelector = (row: DataRow, columnDef: ColumnDef) => {
  return row[columnDef.key] as PropValue;
};
