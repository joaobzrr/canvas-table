import Konva from "konva";
import { LineProps } from ".";
import { Utils } from "./Utils";

export interface LineConfig extends LineProps {
  x: number;
  y: number;
}

const defaultImage = new Image();

export class Line extends Konva.Image {
  static cache?: Map<string, HTMLImageElement>;

  constructor(config: LineConfig) {
    if (!Line.cache) {
      throw new Error("Cache has not been set");
    }

    if (config.length < 1 || config.thickness < 1) {
      super({ ...config, image: defaultImage });
      return;
    }

    const key = Line.cacheKey(config);
    let image = Line.cache.get(key);
    if (!image) {
      image = Line.drawNonAntialiasedLine(config);
    }

    Line.cache.set(key, image);

    super({ ...config, image });
  }

  static setCache(cache: Map<string, HTMLImageElement>) {
    Line.cache = cache;
  }

  static cacheKey(config: LineConfig) {
    const { type, length, thickness, color } = config;
    return `type=${type}, length=${length}, thickness=${thickness}, color=${color}`;
  }

  static drawNonAntialiasedLine(config: LineConfig) {
    const { type, length, thickness, color } = config;

    const canvas = document.createElement("canvas");
    if (type === "hline") {
      canvas.width  = length;
      canvas.height = thickness;
    } else {
      canvas.width  = thickness;
      canvas.height = length;
    }

    const rgb = Utils.hexToRgb(color);
    if (!rgb) {
      throw new Error(`"${color}" is not a valid color`);
    }

    const { r, g, b } = rgb;

    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0;i < data.length; i += 4) {
      data[i + 0] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const img = document.createElement("img");
    img.src = canvas.toDataURL();
    return img;
  }
}
