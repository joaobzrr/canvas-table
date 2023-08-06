import Konva from "konva"
import { KonvaEventObject } from "konva/lib/Node";
import { RectConfig } from "konva/lib/shapes/Rect";

export interface ResizeColumnDraggableConfig extends RectConfig {
  onDragMove: (event: KonvaEventObject<MouseEvent>) => void;
}

export class ResizeColumnDraggable extends Konva.Rect {
  private originalY = 0;

  constructor(config?: ResizeColumnDraggableConfig) {
    super(config);

    this.on("dragstart", () => {
      this.originalY = this.y();
    });

    this.on("dragmove", (event: KonvaEventObject<MouseEvent>) => {
      this.y(this.originalY);
      config?.onDragMove(event);
    })

    this.on("dragend", () => {
      this.destroy();
    })
  }
}
