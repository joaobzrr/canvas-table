import { Font } from "glyph-atlas";
import { TextRenderer } from "./TextRenderer";

function main() {
  const textRenderer = new TextRenderer();

  const body = document.querySelector("body")!;

  const atlasCanvas = (textRenderer as any).glyphAtlas.canvas as HTMLCanvasElement;
  atlasCanvas.style.border = "1px solid black";
  body.appendChild(atlasCanvas);

  const screenCanvasWidth = 512;
  const screenCanvasHeight = 512;
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = screenCanvasWidth;
  screenCanvas.height = screenCanvasHeight;
  screenCanvas.style.border = "1px solid black";
  body.appendChild(screenCanvas);

  const ctx = screenCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false; // @Important

  const font: Font = {
    family: "Arial",
    size: "32px",
    style: "normal"
  };

  const text = "abcdefghijklmnopqrstuvwxyz";
  let originX = 0;
  let originY = 100;

  textRenderer.render(ctx, font, text, originX, originY, 1000, true);
}

main();
