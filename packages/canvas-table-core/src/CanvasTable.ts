import { Platform } from './Platform';
import { Context } from './Context';
import { Gui } from './Gui';
import { computeColumnWidths, compareProps, shallowMerge } from './utils';
import type {
  CanvasTableProps,
  CanvasTableParams,
  ColumnDef,
  DataRow,
  DataRowId,
  PropValue,
} from './types';

export class CanvasTable {
  private ctx: Context;
  private gui: Gui;

  private batchedProps: Partial<CanvasTableProps>[] = [];

  constructor(params: CanvasTableParams) {
    const { container, ...initialProps } = params;

    this.ctx = new Context({
      platform: this.createPlatform(container),
      props: this.createProps(initialProps),
    });

    this.gui = new Gui({ context: this.ctx });

    this.ctx.platform.setCallback(this.update.bind(this));
    this.ctx.platform.startAnimation();
  }

  public config(props: Partial<CanvasTableProps>) {
    this.batchedProps.push(props);
  }

  public destroy() {
    this.ctx.platform.destroy();
  }

  private createProps(...changes: Partial<CanvasTableProps>[]): CanvasTableProps {
    return shallowMerge(defaultProps, ...changes);
  }

  private mergeProps(...changes: Partial<CanvasTableProps>[]): CanvasTableProps {
    return shallowMerge(this.ctx.props, defaultProps, ...changes);
  }

  private update() {
    const newProps = this.mergeProps(...this.batchedProps);
    this.applyProps(newProps);

    this.gui.update();
  }

  private applyProps(newProps: CanvasTableProps) {
    const { layout, props: oldProps } = this.ctx;

    const diff = compareProps(oldProps, newProps);
    if (diff.columnDefs) {
      layout.columnWidths = computeColumnWidths(newProps.columnDefs);
    }

    this.ctx.props = newProps;
  }

  private reattach(prev: Platform) {
    prev.destroy();

    this.ctx.platform = this.createPlatform(prev.containerId);
    this.ctx.platform.setCallback(this.update.bind(this));
    this.ctx.renderer.setRenderingContext(this.ctx.platform.ctx);
    this.ctx.platform.startAnimation();
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
