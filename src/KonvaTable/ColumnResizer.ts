import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";

export interface ColumnResizerConfig extends Omit<GroupConfig, "draggable"> {
  onDrag?: (dx: number) => void;
}

export class ColumnResizer extends Konva.Group {
  rect: Konva.Rect;

  onDrag?: (dx: number) => void;

  originalX = 0;
  originalY = 0;

  constructor(config?: ColumnResizerConfig) {
    super({
      ...config,
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
      const dx = this.x() - this.originalX;
      if (this?.onDrag) {
	this.onDrag(dx);
      }
    })
  }

  setOnDrag(onDrag: (dx: number) => void) {
    this.onDrag = onDrag;
  }
}
