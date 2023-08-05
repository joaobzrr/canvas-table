import Konva from "konva"
import { RectConfig } from "konva/lib/shapes/Rect";

export interface ResizeColumnDraggableConfig extends RectConfig {
  onDragMove: (position: number) => void;
}

export class ResizeColumnDraggable extends Konva.Rect {
  private originalY = 0;

  constructor(config?: ResizeColumnDraggableConfig) {
    super(config);

    this.on("dragstart", () => {
      this.originalY = this.y();
    });

    this.on("dragmove", () => {
      this.y(this.originalY);
      config?.onDragMove(this.x());
    })

    this.on("dragend", () => {
      this.destroy();
    })
  }
}
