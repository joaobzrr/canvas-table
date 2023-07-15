import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { BodyGrid } from "./BodyGrid";
import { TableState } from "./TableState";

export interface BodyConfig extends ComponentConfig {
  tableState: TableState;
}

export class Body extends Component {
  tableState: TableState;

  grid: BodyGrid;

  cellGroup: Konva.Group;
  cellCache: Map<string, Konva.Group>;

  constructor(config: BodyConfig) {
    super(config);

    this.tableState = config.tableState;

    this.grid = new BodyGrid({ tableState: this.tableState })
    this.add(this.grid);

    this.cellGroup = new Konva.Group();
    this.add(this.cellGroup);

    this.cellCache = new Map();

    this.on("widthChange heightChange", this.onResize.bind(this));
  }

  onResize() {
    this.grid.size(this.size());
    this.update();
  }

  onWheel() {
    this.grid.onWheel();
    this.update();
  }

  update() {
    const { x: scrollLeft, y: scrollTop } = this.tableState.scrollPosition;
    const { columnLeft, columnRight, rowTop, rowBottom } = this.tableState.tableRanges;
    const { theme } = this.tableState;

    this.cellGroup.removeChildren();

    for (let i = rowTop; i < rowBottom; i++) {
      const dataRow = this.tableState.getDataRow(i);
      const y = i * theme.rowHeight - scrollTop;

      for (let j = columnLeft; j < columnRight; j++) {
        const columnState = this.tableState.getColumnState(j);
        const x = columnState.position - scrollLeft;

        const cell = this.getCell(i, j);
        if (!cell.parent) this.cellGroup.add(cell);

        cell.setPosition({ x, y });

        const text = cell.findOne("Text") as Konva.Text;
        text.text(dataRow[columnState.field]);
      }
    }
  }

  getCell(rowIndex: number, colIndex: number) {
    const key = `cell-${rowIndex}-${colIndex}`;
    let cell = this.cellCache.get(key);
    if (cell) return cell;

    const { theme } = this.tableState;

    const columnState = this.tableState.getColumnState(colIndex);

    cell = new Konva.Group({
      row: rowIndex,
      col: colIndex,
      name: key
    });

    cell.add(new Konva.Text({
      x: theme.cellPadding,
      width: columnState.width - theme.cellPadding * 2,
      height: theme.rowHeight,
      fontSize: theme.fontSize,
      fontFamily: theme.fontFamily,
      fill: theme.fontColor,
      verticalAlign: "middle",
      wrap: "none",
      ellipsis: true
    }));

    this.cellCache.set(key, cell);

    return cell;
  }
}
