import { Size } from "../../types";
import { LineRenderer } from "./LineRenderer";
import { TextRenderer } from "./TextRenderer";
import { Shape } from "./types";

export class Renderer {
  textRenderer: TextRenderer;
  lineRenderer: LineRenderer;

  renderQueue: Shape[];

  constructor() {
    this.textRenderer = new TextRenderer();
    this.textRenderer.setEllipsis(true);

    this.lineRenderer = new LineRenderer();

    this.renderQueue = [];
  }

  submit(shape: Shape) {
    this.renderQueue.unshift(shape);
  }

  render(ctx: CanvasRenderingContext2D, canvasSize: Size) {
    this.sortRenderQueue();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    while (this.renderQueue.length > 0) {
      const shape = this.renderQueue.pop()!;

      if (shape.clipRegion) {
        ctx.save();
        ctx.clip(shape.clipRegion);
      }

      switch (shape.type) {
        case "text": {
          const { x, y, color, font, text, maxWidth } = shape;

          this.textRenderer.setFont(font);
          this.textRenderer.setColor(color);
          this.textRenderer.render(ctx, text, x, y, maxWidth);
        } break;
        case "line": {
          const { x, y, length, orientation, color } = shape;

          this.lineRenderer.setColor(color);

          if (orientation === "horizontal") {
            this.lineRenderer.hline(ctx, x, y, length);
          } else {
            this.lineRenderer.vline(ctx, x, y, length);
          }
        } break;
        case "rect": {
          const { x, y, width, height, color } = shape;

          ctx.fillStyle = color;
          ctx.fillRect(x, y, width, height);
        } break;
      }

      if (shape.clipRegion) {
        ctx.restore();
      }
    }

    ctx.restore();
  }

  sortRenderQueue() {
    this.renderQueue.sort((a, b) => {
      const { sortOrder: aSortOrder = 0 } = a;
      const { sortOrder: bSortOrder = 0 } = b;
      return bSortOrder - aSortOrder;
    });
  }
}
