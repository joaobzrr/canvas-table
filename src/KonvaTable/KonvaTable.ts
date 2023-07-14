import Konva from "konva";
import { Body } from "./Body";
import { Head } from "./Head";
import { HorizontalScrollbar } from "./HorizontalScrollbar";
import { VerticalScrollbar } from "./VerticalScrollbar";
import { TableState } from "./TableState";
import { Vector } from "./Vector";
import { KonvaTableOptions, ColumnDef } from "./types";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;

  head: Head;
  body: Body;

  hsb: HorizontalScrollbar;
  vsb: VerticalScrollbar;

  constructor(options: KonvaTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.tableState = new TableState();

    const { theme } = this.tableState;
    
    const columnStates = this.columnDefsToColumnStates(options.columnDefs);
    this.tableState.setTableData(columnStates, options.dataRows);

    this.body = new Body({ tableState: this.tableState });
    this.layer.add(this.body);

    this.head = new Head({ tableState: this.tableState });
    this.layer.add(this.head);

    this.hsb = new HorizontalScrollbar({ tableState: this.tableState });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState: this.tableState,
      y: theme.rowHeight
    });
    this.layer.add(this.vsb);
  }

  setCanvasDimensions(size: { width: number, height: number }) {
    this.stage.width(size.width);
    this.stage.height(size.height);

    this.tableState.setViewportDimensions(new Vector(size.width, size.height));

    const { x: tableWidth, y: tableHeight } = this.tableState.tableDimensions;
    const { theme } = this.tableState;

    const bodyWidthWithoutOverflow = size.width;
    const bodyWidthWithOverflow = bodyWidthWithoutOverflow - theme.scrollBarThickness;

    const bodyHeightWithoutOverflow = size.height - theme.rowHeight;
    const bodyHeightWithOverflow = bodyHeightWithoutOverflow - theme.scrollBarThickness;

    const hsbIsVisible = bodyHeightWithOverflow < tableHeight;
    const bodyWidth = hsbIsVisible ? bodyWidthWithOverflow : bodyWidthWithoutOverflow;
    this.body.width(bodyWidth);

    const vsbIsVisible = bodyWidthWithOverflow < tableWidth;
    const bodyHeight = vsbIsVisible ? bodyHeightWithOverflow : bodyHeightWithoutOverflow;
    this.body.height(bodyHeight);

    this.hsb.y(size.height - theme.scrollBarThickness);
    this.hsb.width(bodyWidth);
    this.hsb.visible(hsbIsVisible);
    this.hsb.onResize();
    //this.hsb.onResize();

    this.vsb.x(bodyWidth);
    this.vsb.height(bodyHeight);
    this.vsb.visible(vsbIsVisible);
    this.vsb.onResize();
    //this.vsb.onResize();
  }

  columnDefsToColumnStates(columnDefs: ColumnDef[]) {
    const result = [];
    let total = 0;

    for (const columnDef of columnDefs) {
      result.push({ ...columnDef, position: total });
      total += columnDef.width;
    }

    return result;
  }
}
