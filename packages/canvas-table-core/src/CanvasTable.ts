import { Platform } from './Platform';
import { Context } from './Context';
import { Gui } from './Gui';
import { defaultTheme } from './defaultTheme';
import { shallowMerge, computeColumnWidths, compareProps } from './utils';
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
      props: shallowMerge(defaultProps, initialProps),
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

  private update() {
    const { props } = this.ctx;

    const newProps = shallowMerge<CanvasTableProps>(props, defaultProps, ...this.batchedProps);
    this.handleChanges(newProps);

    this.ctx.props = newProps;

    this.gui.update();
  }

  private handleChanges(newProps: CanvasTableProps) {
    const { layout, props: oldProps } = this.ctx;

    const diff = compareProps(oldProps, newProps);
    if (diff.columnDefs) {
      layout.columnWidths = computeColumnWidths(newProps.columnDefs);
    }
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
  theme: defaultTheme,
  selectId: (row: DataRow) => {
    return row.id as DataRowId;
  },
  selectProp: (row: DataRow, columnDef: ColumnDef) => {
    return row[columnDef.key] as PropValue;
  },
};
