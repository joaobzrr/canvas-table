import Konva from "konva";
import { ShapeConfig } from "konva/lib/Shape";
import { Context } from "konva/lib/Context";
import pick from "lodash/pick";
import { Utils } from "./Utils";
import { LineProps } from "./types";

export interface LineConfig extends ShapeConfig, Partial<LineProps> {
}

export class Line extends Konva.Shape {
  props: Partial<LineProps>;

  constructor(config: LineConfig) {
    super(config);

    this.props = pick(config.props, ["type", "length", "thickness", "color"]);
    this.sceneFunc(this.drawShape);
  }

  drawShape(context: Context) {
    const { type, length, thickness, color } = this.props;
    if (type === undefined || length === undefined || thickness === undefined || color === undefined) {
      return;
    }

    let width:  number;
    let height: number;
    if (type === "horizontal") {
      width  = length;
      height = thickness;
    } else {
      width  = thickness;
      height = length;
    }

    const rgb = Utils.hexToRgb(color);
    if (!rgb) {
      throw new Error(`"${color}" is not a valid color`);
    }

    const { r, g, b } = rgb;

    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i + 0] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
  }

  setAttr(attr: string, val: any) {
    if (attr in this.props) {
      (this.props as any)[attr] = val;
      this.draw();
    } else {
      super.setAttr(attr, val);
    }
    return this;
  }

  setAttrs(config: any) {
    const props = pick(config.props, ["type", "length", "thickness", "color"])
    this.props = { ...this.props, ...props };
    super.setAttrs(config);
    this.draw();
    return this;
  }
}
