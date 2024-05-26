import { type Platform } from './Platform';
import { Renderer } from './Renderer';
import { Layout } from './Layout';
import { type CanvasTableProps } from './types';

export type CanvasTableContextParams = {
  platform: Platform;
  props: CanvasTableProps;
};

export class Context {
  platform: Platform;
  renderer: Renderer;
  layout: Layout;
  props: CanvasTableProps;

  constructor(params: CanvasTableContextParams) {
    this.platform = params.platform;
    this.props = params.props;

    this.renderer = new Renderer({ ctx: this.platform.ctx });
    this.layout = new Layout({ context: this });
  }
}
