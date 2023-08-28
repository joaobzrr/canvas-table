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
      name: "resize-column-button"
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
        const newX = centerx - (this.width() / 2) + 1;
        this.x(newX);
      }
    });

    this.on("stateChange", event => {
      const state = (event as any).newVal as string;
      if (!state) {
        this.opacity(0);
        return;
      }

      switch (state) {
        case "normal": break;
        case "hover":
        case "active": {
          this.opacity(0.6);
        } break;
        default: {
          console.warn(`Unknown state '${state}'`);
        } break;
      }
    });
  }
}
