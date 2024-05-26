import { Platform } from './Platform';
import { Layout } from './Layout';
import { type CanvasTableProps } from './types';

export type CanvasTableContextParams = {
  containerId: string;
  props: CanvasTableProps;
};

export class Context {
  platform: Platform;
  props: CanvasTableProps;
  layout: Layout;

  constructor(params: CanvasTableContextParams) {
    this.platform = new Platform({
      containerId: params.containerId,
    });

    this.props = params.props;
    this.layout = new Layout({ context: this });
  }
}
