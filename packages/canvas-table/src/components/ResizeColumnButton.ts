import Konva from "konva";
import { RectConfig } from "konva/lib/shapes/Rect";

export interface ResizeColumnButtonConfig extends RectConfig {
  onMouseDown: (columnIndex: number) => void;
}

export class ResizeColumnButton extends Konva.Rect {
  constructor(config: ResizeColumnButtonConfig) {
    super(config);

    this.on("mouseenter", () => {
      this.getStage()!.container().style.cursor = "col-resize";
    });

    this.on("mouseleave", () => {
      this.getStage()!.container().style.cursor = "default";
    });

    this.on("mousedown", () => {
      const columnIndex = this.getAttr("columnIndex") as number;
      config.onMouseDown(columnIndex);
    });

    this.on("centerxChange", event => {
      const centerx = (event as any).newVal as number;
      const newX = centerx - this.width() / 2;
      this.x(newX);
    });
  }
}
