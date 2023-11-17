import { Size } from "../../types";
import { LineRenderer } from "../LineRenderer";
import { TextRenderer } from "../TextRenderer";
import { RectShape, Shape } from "./types";

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
    this.renderQueue.sort((a, b) => {
      const { sortOrder: aSortOrder = 0 } = a;
      const { sortOrder: bSortOrder = 0 } = b;
      return bSortOrder - aSortOrder;
    });

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
          break;
        }
        case "line": {
          const { x, y, length, orientation, color } = shape;

          this.lineRenderer.setColor(color);

          if (orientation === "horizontal") {
            this.lineRenderer.hline(ctx, x, y, length);
          } else {
            this.lineRenderer.vline(ctx, x, y, length);
          }

          break;
        }
        case "rect": {
          this.strokeRect(ctx, shape);

          const { fillColor } = shape;
          if (fillColor) {
            const { x, y, width, height } = shape;
            ctx.fillStyle = fillColor;
            ctx.fillRect(x, y, width, height);
          }

          break;
        }
      }

      if (shape.clipRegion) {
        ctx.restore();
      }
    }

    ctx.restore();
  }

  strokeRect(ctx: CanvasRenderingContext2D, shape: RectShape) {
    const { x, y, width, height, strokeColor, strokeWidth } = shape;

    if (!strokeColor || !strokeWidth) {
      return;
    }

    let x1 = x;
    let y1 = y;
    let x2 = x + width;
    let y2 = y + height;

    this.lineRenderer.setColor(strokeColor!);

    for (let i = 0; i < strokeWidth; i++) {
      const w = x2 - x1 + 1;
      const h = y2 - y1 + 1;

      this.lineRenderer.hline(ctx, x1, y1, w);
      this.lineRenderer.hline(ctx, x1, y2, w);
      this.lineRenderer.vline(ctx, x1, y1, h);
      this.lineRenderer.vline(ctx, x2, y1, h);

      x1++;
      y1++;
      x2--;
      y2--;
    }
  }
}
