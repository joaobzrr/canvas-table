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
  private platform: Platform;
  private state: TableState;
  private gui: Gui;

  private batchedProps: Partial<CanvasTableProps>[] = [];

  constructor(params: CanvasTableParams) {
    const { container, ...rest } = params;

    this.platform = this.createPlatform(container);
    this.state = new TableState(this.platform, CanvasTable.createProps(rest));
    this.gui = new Gui(this.platform, this.state);

    this.platform.updateFunction = this.update.bind(this);
    this.platform.startAnimation();
  }

  public config(props: Partial<CanvasTableProps>) {
    this.batchedProps.push(props);
  }

  public destroy() {
    this.platform.destroy();
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

  private reattach(prevPlatform: Platform) {
    prevPlatform.destroy();

    this.platform = this.createPlatform(prevPlatform.containerId);
    this.state.setPlatform(this.platform);
    this.gui.setPlatform(this.platform);

    this.platform.updateFunction = this.update.bind(this);
    this.platform.startAnimation();
  }

  private createPlatform(containerId: string) {
    return new Platform({ containerId, onDetach: this.reattach.bind(this) });
  }
}

const defaultIdSelector = (row: DataRow) => {
  return row.id as DataRowId;
};

const defaultPropSelector = (row: DataRow, columnDef: ColumnDef) => {
  return row[columnDef.key] as PropValue;
};
