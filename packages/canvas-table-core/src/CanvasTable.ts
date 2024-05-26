import { Platform } from './Platform';
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
      platform: this.createPlatform(container),
      props: this.createProps(initialProps),
    });

    this.gui = new Gui({ context: this.context });

    this.context.platform.callback = this.update.bind(this);
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
    this.context.layout.canvasWidth = this.context.platform.canvas.width;
    this.context.layout.canvasHeight = this.context.platform.canvas.height;
    this.context.props = this.mergeProps(...this.batchedProps);

    this.gui.update();
  }

  private reattach(prev: Platform) {
    prev.destroy();

    this.context.platform = this.createPlatform(prev.containerId);
    this.context.platform.setCallback(this.update.bind(this));
    this.context.renderer.setRenderingContext(this.context.platform.ctx);
    this.context.platform.startAnimation();
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
