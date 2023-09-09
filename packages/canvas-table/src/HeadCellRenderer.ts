import Konva from "konva";
import { TextRenderer } from "text-renderer";
import { TableState, NodeManager, ObjectPool } from "./core";
import { HeadCell } from "./components";

export class HeadCellRenderer {
  private tableState: TableState;
  private textRenderer: TextRenderer;
  private pool: ObjectPool<HeadCell>;
  private manager: NodeManager<HeadCell>;

  constructor(tableState: TableState, textRenderer: TextRenderer) {
    this.tableState = tableState;
    this.textRenderer = textRenderer;
    this.pool = new ObjectPool({
      initialSize: 30,
      factory: {
        make: () => this.createHeadCell(),
        reset: cell => this.resetHeadCell(cell)
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

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const cell = this.manager.get();
      cell.setAttrs({
        x,
        width: columnState.width,
        height: rowHeight,
        text: columnState.title,
        theme
      });
    }
  }

  private createHeadCell() {
    return new HeadCell({
      textRenderer: this.textRenderer,
      theme: this.tableState.getTheme()
    });
  }

  private resetHeadCell(cell: HeadCell) {
    return cell.setAttrs({ x: 0, y: 0 });
  }
}
