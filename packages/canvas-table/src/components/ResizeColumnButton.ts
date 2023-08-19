import Konva from "konva";
import { RectConfig } from "konva/lib/shapes/Rect";
import { RESIZE_COLUMN_BUTTON_SIDE } from "../constants";

export interface ResizeColumnButtonConfig extends RectConfig {
  onMouseDown: (columnIndex: number) => void;
}

export class ResizeColumnButton extends Konva.Rect {
  constructor(config: ResizeColumnButtonConfig) {
    super({
      ...config,
      width: (RESIZE_COLUMN_BUTTON_SIDE * 2) + 1,
      fill: "#3367D1",
      opacity: 0,
    });

    this.on("mouseenter", () => {
      this.getStage()!.container().style.cursor = "col-resize";
      this.opacity(0.6);
    });

    this.on("mouseleave", () => {
      this.getStage()!.container().style.cursor = "default";
      this.opacity(0);
    });

    this.on("mousedown", () => {
      const columnIndex = this.getAttr("columnIndex") as number;
      if (columnIndex !== undefined) {
        config.onMouseDown(columnIndex);
      }
    });

    this.on("centerxChange", event => {
      const centerx = (event as any).newVal as number | undefined;
      if (centerx) {
        const newX = centerx - this.width() / 2;
        this.x(newX);
      }
    });

    this.on("activeChange", event => {
      const active = (event as any).newVal as boolean | undefined;
      this.opacity(active ? 0.6 : 0);
    });
  }
}
