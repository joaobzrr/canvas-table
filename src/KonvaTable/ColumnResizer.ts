import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { COLUMN_RESIZER_SIDE } from "./constants";

const COLUMN_RESIZER_WIDTH = (COLUMN_RESIZER_SIDE * 2) + 1;

export interface ColumnResizerConfig extends Omit<GroupConfig, "width" | "draggable" > {
  onDrag?: (position: number) => void;
}

export class ColumnResizer extends Konva.Group {
  rect: Konva.Rect;

  onDrag?: (position: number) => void;

  originalX = 0;
  originalY = 0;

  constructor(config?: ColumnResizerConfig) {
    super({
      ...config,
      width: COLUMN_RESIZER_WIDTH,
      draggable: true
    });

    this.rect = new Konva.Rect({
      width: this.width(),
      height: this.height(),
      fill: "red"
    });
    this.add(this.rect);

    this.onDrag = config?.onDrag;

    this.on("mouseenter", () => {
      this.getStage()!.container().style.cursor = "col-resize";
    });

    this.on("mouseleave", () => {
      this.getStage()!.container().style.cursor = "default";
    });

    this.on("widthChange heightChange", () => {
      this.rect.size(this.size());
    });

    this.on("dragstart", () => {
      this.originalX = this.x();
      this.originalY = this.y();
    });

    this.on("dragmove", () => {
      this.y(this.originalY);

      if (this?.onDrag) {
	this.onDrag(this.x() + COLUMN_RESIZER_SIDE);
      }
    })
  }

  setOnDrag(onDrag: (dx: number) => void) {
    this.onDrag = onDrag;
  }

  setCenterx(centerx: number) {
    this.x(centerx - COLUMN_RESIZER_SIDE);
  }
}
