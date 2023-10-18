import { TextRenderer } from "text-renderer";
import { makeFontSpecifier } from "./utils";

const TEXT = "abracadabra";

const FONT = {
  family: "Arial",
  size: 20,
  style: "normal" as const,
  color: "black"
};

const X = 3;
const Y = 20;

const CANVAS_WIDTH  = 320;
const CANVAS_HEIGHT = 240;

export function test1() {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width  = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.style.marginRight = "10px";
  canvas.style.border = "1px solid black";
  root.appendChild(canvas);

  const textRenderer = new TextRenderer();
  const offscreenCanvas: HTMLCanvasElement = (textRenderer as any).glyphAtlas.canvas;
  offscreenCanvas.style.border = "1px solid black";
  root.appendChild(offscreenCanvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.imageSmoothingEnabled = false;

  const fontSpecifier = makeFontSpecifier(FONT.family, FONT.size, FONT.style);
  ctx.font = fontSpecifier;
  ctx.fillText(TEXT, X, Y);

  textRenderer.render(ctx, FONT, TEXT, X, Y + 10);
}
