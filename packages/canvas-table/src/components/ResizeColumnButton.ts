import Konva from "konva";
import { RectConfig } from "konva/lib/shapes/Rect";

export interface ResizeColumnButtonConfig extends RectConfig {
}

export class ResizeColumnButton extends Konva.Rect {
  constructor(config?: ResizeColumnButtonConfig) {
    super(config);

    this.on("mouseenter", () => {
      this.getStage()!.container().style.cursor = "col-resize";
    });

    this.on("mouseleave", () => {
      this.getStage()!.container().style.cursor = "default";
    });

    this.on("onMouseDownChange", event => {
      const mouseDownHandler = (event as any).newVal;
      this.setAttr("mouseDownHandler", mouseDownHandler);
      this.on("mousedown", mouseDownHandler);
    });

    this.on("centerxChange", event => {
      const centerx = (event as any).newVal;
      const newX = centerx - this.width() / 2;
      this.x(newX);
    });
  }
}
