import { Component, ComponentConfig } from "./Component";
import { BodyGrid } from "./BodyGrid";
import { TableState } from "./TableState";

export interface BodyConfig extends ComponentConfig {
  tableState: TableState;
}

export class Body extends Component {
  tableState: TableState;

  grid: BodyGrid;

  constructor(config: BodyConfig) {
    super(config);

    this.tableState = config.tableState;

    this.grid = new BodyGrid({ tableState: this.tableState })
    this.add(this.grid);
  }

  onResize() {
    this.grid.width(this.width());
    this.grid.height(this.height());
    this.grid.onResize();
  }

  onWheel() {
    this.grid.onWheel();
  }
}
