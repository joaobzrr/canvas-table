import { Platform } from './Platform';
import { TableState } from './TableState';
import { type CanvasTableProps } from './types';

export type CanvasTableContextParams = {
  containerId: string;
  props: CanvasTableProps;
};

export class Context {
  platform: Platform;
  props: CanvasTableProps;
  state: TableState;

  constructor(params: CanvasTableContextParams) {
    this.platform = new Platform({
      containerId: params.containerId,
    });

    this.props = params.props;
    this.state = new TableState({ context: this });
  }
}
