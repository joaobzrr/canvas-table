import Konva from "konva";
import { Context } from "konva/lib/Context";
import { ShapeConfig } from "konva/lib/Shape";

export interface GridConfig extends ShapeConfig {
}

export class Grid extends Konva.Shape {
  constructor(config: GridConfig) {
    super(config);
    this.sceneFunc(this.drawShape);
  }

  drawShape(ctx: Context) {
    const canvas = ctx.getCanvas();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  putHorizontalLine(
    imageData: ImageData,
    rgba: [number, number, number, number],
    y: number
  ) {
    const { width, data } = imageData;
    const stride = width * 4;

    const [red, green, blue, alpha] = rgba;

    const start = y * stride;
    const end = start + stride;
    for (let i = start; i < end; i += 4) {
      data[i + 0] = red;
      data[i + 1] = green;
      data[i + 2] = blue;
      data[i + 3] = alpha;
    }
  }

  putVerticalLine(
    imageData: ImageData,
    rgba: [number, number, number, number],
    x: number
  ) {
    const { width, height, data } = imageData;
    const stride = width * 4;

    const [red, green, blue, alpha] = rgba;

    const start = x * 4;
    const end = height * stride;
    for (let i = start; i < end; i += stride) {
      data[i + 0] = red;
      data[i + 1] = green;
      data[i + 2] = blue;
      data[i + 3] = alpha;
    }
  }
}
