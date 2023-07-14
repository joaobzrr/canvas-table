import { Component, ComponentConfig } from "./Component";
import { Grid } from "./Grid";
import { TableState } from "./TableState";

export interface BodyConfig extends ComponentConfig {
  tableState: TableState;
}

export class Body extends Component {
  tableState: TableState;

  grid: Grid;

  constructor(config: BodyConfig) {
    super(config);

    this.tableState = config.tableState;
    this.grid = new Grid({ tableState: this.tableState })
    this.add(this.grid);

    this.on("resize", this.onResize.bind(this))
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
