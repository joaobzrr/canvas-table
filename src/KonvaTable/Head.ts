import { Component, ComponentConfig } from "./Component";
import { TableState } from "./TableState";

export interface HeadConfig extends ComponentConfig {
  tableState: TableState;
}

export class Head extends Component {
  tableState: TableState;

  constructor(config: HeadConfig) {
    super(config);

    this.tableState = config.tableState;
  }

  onResize(size: { width: number, height: number }) {
  }
}
