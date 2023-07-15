import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Body } from "./Body";
import { Head } from "./Head";
import { HorizontalScrollbar } from "./HorizontalScrollbar";
import { VerticalScrollbar } from "./VerticalScrollbar";
import { TableState } from "./TableState";
import { Vector } from "./Vector";
import { KonvaTableOptions, ColumnDef, Dimensions } from "./types";

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

    this.body = new Body({
      tableState: this.tableState,
      y: theme.rowHeight
    });
    this.layer.add(this.body);

    this.head = new Head({
      tableState: this.tableState,
      height: theme.rowHeight
    });
    this.layer.add(this.head);

    this.hsb = new HorizontalScrollbar({ tableState: this.tableState });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState: this.tableState,
      y: theme.rowHeight
    });
    this.layer.add(this.vsb);

    this.stage.on("wheel", this.onWheel.bind(this));
  }

  onWheel(event: KonvaEventObject<WheelEvent>) {
    const { x: scrollLeft, y: scrollTop } = this.tableState.scrollPosition;

    const newScrollLeft = new Vector({
      x: Math.round(scrollLeft + event.evt.deltaX),
      y: Math.round(scrollTop  + event.evt.deltaY)
    });

    this.tableState.setScrollPosition(newScrollLeft);

    this.body.onWheel();
    this.head.onWheel();
    this.hsb.onWheel();
    this.vsb.onWheel();
  }

  setStageDimensions(stageDimensions: Dimensions) {
    this.stage.size(stageDimensions);

    const { width: stageWidth, height: stageHeight } = stageDimensions;

    const { x: tableWidth, y: tableHeight } = this.tableState.tableDimensions;
    const { theme } = this.tableState;

    const bodyWidthWithoutOverflow = stageWidth;
    const bodyWidthWithOverflow = bodyWidthWithoutOverflow - theme.scrollBarThickness;

    const bodyHeightWithoutOverflow = stageHeight - theme.rowHeight;
    const bodyHeightWithOverflow = bodyHeightWithoutOverflow - theme.scrollBarThickness;

    const hsbIsVisible = bodyHeightWithOverflow < tableHeight;
    const bodyWidth = hsbIsVisible ? bodyWidthWithOverflow : bodyWidthWithoutOverflow;

    const vsbIsVisible = bodyWidthWithOverflow < tableWidth;
    const bodyHeight = vsbIsVisible ? bodyHeightWithOverflow : bodyHeightWithoutOverflow;

    this.tableState.setViewportDimensions(new Vector({ x: bodyWidth, y: bodyHeight }));

    this.body.size({ width: bodyWidth, height: bodyHeight });

    this.head.width(bodyWidth);

    this.hsb.setAttrs({
      y: stageHeight - theme.scrollBarThickness,
      width: bodyWidth,
      visible: hsbIsVisible
    });

    this.vsb.setAttrs({
      x: bodyWidth,
      height: bodyHeight,
      visible: vsbIsVisible
    });
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
