import { Platform } from './Platform';
import { Gui } from './Gui';
import { TableState } from './TableState';
import { shallowMerge } from './utils';
import type {
  CanvasTableProps,
  CanvasTableParams,
  ColumnDef,
  DataRow,
  DataRowId,
  PropValue,
} from './types';

export class CanvasTable {
  private platform: Platform;
  private state: TableState;
  private gui: Gui;

  private batchedProps: Partial<CanvasTableProps>[] = [];

  constructor(params: CanvasTableParams) {
    const { container, ...props } = params;

    this.platform = this.createPlatform(container);
    this.state = new TableState(this.platform, this.createProps(props));
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

  private createProps(...changes: Partial<CanvasTableProps>[]): CanvasTableProps {
    return shallowMerge(defaultProps, ...changes);
  }

  private mergeProps(...changes: Partial<CanvasTableProps>[]): CanvasTableProps {
    return shallowMerge(this.state.props, defaultProps, ...changes);
  }

  private update() {
    this.state.layout.canvasWidth = this.platform.canvas.width;
    this.state.layout.canvasHeight = this.platform.canvas.height;

    this.state.props = this.mergeProps(...this.batchedProps);

    this.state.update();
    this.gui.update(this.state);
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

const defaultProps: Partial<CanvasTableProps> = {
  selectId: (row: DataRow) => {
    return row.id as DataRowId;
  },
  selectProp: (row: DataRow, columnDef: ColumnDef) => {
    return row[columnDef.key] as PropValue;
  },
};
