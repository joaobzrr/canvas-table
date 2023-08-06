import Konva from "konva";
import { RectConfig } from "konva/lib/shapes/Rect";
import { RESIZE_COLUMN_BUTTON_SIDE } from "../constants";

const RESIZE_COLUMN_BUTTON_WIDTH = (RESIZE_COLUMN_BUTTON_SIDE * 2) + 1;

export interface ResizeColumnButtonConfig extends Omit<RectConfig, "width"> {
  onMouseDown?: () => void;
}

export class ResizeColumnButton extends Konva.Rect {
  constructor(config?: ResizeColumnButtonConfig) {
    super({
      ...config,
      width: RESIZE_COLUMN_BUTTON_WIDTH,
    });

    this.on("mouseenter", () => {
      this.getStage()!.container().style.cursor = "col-resize";
    });

    this.on("mouseleave", () => {
      this.getStage()!.container().style.cursor = "default";
    });

    if (config?.onMouseDown) {
      this.on("mousedown", config.onMouseDown);
    }
  }

  setCenterx(centerx: number) {
    this.x(centerx - RESIZE_COLUMN_BUTTON_SIDE);
  }

  setOnMouseDown(onMouseDown: () => void) {
    this.removeEventListener("mousedown");
    this.on("mousedown", onMouseDown);
  }
}
