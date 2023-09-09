import Konva from "konva";
import { TableState, NodeManager, ObjectPool } from "./core";
import { BodyCell } from "./components";
import { TextRenderer } from "text-renderer";

export class BodyCellRenderer {
  private tableState: TableState;
  private textRenderer: TextRenderer;
  private pool: ObjectPool<BodyCell>;
  private manager: NodeManager<BodyCell>;

  constructor(tableState: TableState, textRenderer: TextRenderer) {
    this.tableState = tableState;
    this.textRenderer = textRenderer;
    this.pool = new ObjectPool({
      initialSize: 1000,
      factory: {
        make: () => this.createBodyCell(),
        reset: cell => this.resetBodyCell(cell)
      }
    });
    this.manager = new NodeManager(this.pool);
  }

  public init(group: Konva.Group) {
    group.add(this.manager.getGroup());
  }

  public render() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges = this.tableState.getTableRanges();

    const theme = this.tableState.getTheme();
    const { rowHeight } = theme;

    this.manager.clear();

    const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;
    for (let rowIndex = rowTop; rowIndex < rowBottom; rowIndex++) {
      const dataRow = this.tableState.getDataRow(rowIndex);
      const y = rowIndex * rowHeight - scrollPosition.y;

      for (let colIndex = columnLeft; colIndex < columnRight; colIndex++) {
        const columnState = this.tableState.getColumnState(colIndex);
        const x = columnState.position - scrollPosition.x;

        const cell = this.manager.get();
        cell.setAttrs(({
          x, y,
          width: columnState.width,
          height: rowHeight,
          text: dataRow[columnState.field],
          theme
        }));
      }
    }
  }

  private createBodyCell() {
    return new BodyCell({
      textRenderer: this.textRenderer,
      theme: this.tableState.getTheme()
    });
  }

  private resetBodyCell(cell: BodyCell) {
    return cell.setAttrs({ x: 0, y: 0 });
  }
}
