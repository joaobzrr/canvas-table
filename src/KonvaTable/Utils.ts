import { GlyphAtlasSpec, LineProps } from "./types";

const charset = Array.from({ length: 255 }, (_, i) => String.fromCharCode(i)).join("");

export class Utils {
  static drawNonAntialiasedLine(props: LineProps) {
    const { type, length, thickness, color } = props;

    const canvas = document.createElement("canvas");
    if (type === "horizontal") {
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

    for (let i = 0; i < data.length; i += 4) {
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

  static createGlyphAtlas(spec: GlyphAtlasSpec) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    if (!ctx) {
      throw new Error("Failed to instantiate context");
    }

    function setupContext() {
      const { fontFamily, fontSize, fontStyle, fillStyle } = spec;
      ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = fillStyle;
      ctx.textBaseline = "top";
    }

    setupContext();

    const metrics = ctx.measureText(charset);
    canvas.width = metrics.width;
    canvas.height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;

    // @Note We have to do this again because changing the canvas
    // dimensions resets the context properties.
    setupContext();

    ctx.fillText(charset, 0, 0);

    return createImageBitmap(canvas);
  }

  static scale(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) {
    if (value <= fromMin) {
      return toMin;
    } else if (value >= fromMax) {
      return toMax;
    } else {
      return Math.round((value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin);
    }
  }

  static hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}
