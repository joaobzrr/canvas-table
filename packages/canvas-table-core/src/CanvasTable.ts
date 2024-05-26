import { Context } from './Context';
import { Gui } from './Gui';
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
  private context: Context;

  private gui: Gui;

  private batchedProps: Partial<CanvasTableProps>[] = [];

  constructor(params: CanvasTableParams) {
    const { container, ...initialProps } = params;

    this.context = new Context({
      containerId: container,
      props: this.createProps(initialProps),
    });

    this.gui = new Gui({ context: this.context });

    this.context.platform.updateFunction = this.update.bind(this);
    this.context.platform.startAnimation();
  }

  public config(props: Partial<CanvasTableProps>) {
    this.batchedProps.push(props);
  }

  public destroy() {
    this.context.platform.destroy();
  }

  private createProps(...changes: Partial<CanvasTableProps>[]): CanvasTableProps {
    return shallowMerge(defaultProps, ...changes);
  }

  private mergeProps(...changes: Partial<CanvasTableProps>[]): CanvasTableProps {
    return shallowMerge(this.context.props, defaultProps, ...changes);
  }

  private update() {
    this.context.state.layout.canvasWidth = this.context.platform.canvas.width;
    this.context.state.layout.canvasHeight = this.context.platform.canvas.height;
    this.context.props = this.mergeProps(...this.batchedProps);

    this.gui.update();
  }

  // private reattach(prevPlatform: Platform) {
  //   prevPlatform.destroy();

  //   this.platform = this.createPlatform(prevPlatform.containerId);
  //   this.context.state.setPlatform(this.platform);
  //   this.gui.setPlatform(this.platform);

  //   this.platform.updateFunction = this.update.bind(this);
  //   this.platform.startAnimation();
  // }

  //private createPlatform(containerId: string) {
  //  return new Platform({ containerId, onDetach: this.reattach.bind(this) });
  //}
}

const defaultProps: Partial<CanvasTableProps> = {
  selectId: (row: DataRow) => {
    return row.id as DataRowId;
  },
  selectProp: (row: DataRow, columnDef: ColumnDef) => {
    return row[columnDef.key] as PropValue;
  },
};
