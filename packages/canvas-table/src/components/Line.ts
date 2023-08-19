import Konva from "konva";
import { ShapeConfig } from "konva/lib/Shape";
import { ImageConfig } from "konva/lib/shapes/Image";

export interface LineConfig extends Omit<ImageConfig, "image"> {
  fill?: ShapeConfig["fill"];
}

export class Line extends Konva.Image {
  private static imageCache = new Map<string, ImageBitmap>;

  constructor(config?: LineConfig) {
    super({
      ...config,
      image: undefined,
      listening: false
    });

    this.updateImage();
    this.on("widthChange heightChange fillChange", this.updateImage);
  }

  private async updateImage() {
    if (this.width() <= 0 || this.height() <= 0 || !this.fill()) {
      return;
    }

    const key = `${this.width()}-${this.height()}-${this.fill()}`;
    let image = Line.imageCache.get(key);
    if (image) {
      this.image(image);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width  = this.width();
    canvas.height = this.height();

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create CanvasRenderingContext2D");
    }

    ctx.fillStyle = this.fill();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    image = await createImageBitmap(canvas);
    Line.imageCache.set(key, image);

    this.image(image);
  }
}
