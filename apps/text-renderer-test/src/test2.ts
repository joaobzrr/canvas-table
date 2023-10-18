import { TextRenderer } from "text-renderer";
import { makeFontSpecifier } from "./utils";

const CHAR = "j";

const FONT = {
  family: "Arial",
  size: 50,
  style: "normal" as const,
  color: "black"
};

const SX = 10;
const SY = 40;

const DX = 5;
const DY = 3;

const PADDING = 1;

export function test2() {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }

  const onScreenCanvas = document.createElement("canvas");
  onScreenCanvas.style.marginRight = "10px";
  onScreenCanvas.style.border = "1px solid black";
  root.appendChild(onScreenCanvas);

  const offScreenCanvas = document.createElement("canvas");
  offScreenCanvas.style.border = "1px solid black";
  root.appendChild(offScreenCanvas);

  const onScreenCanvasCtx  = getContext(onScreenCanvas);
  const offScreenCanvasCtx = getContext(offScreenCanvas);

  offScreenCanvasCtx.font = makeFontSpecifier(FONT.family, FONT.size, FONT.style);

  const metrics = offScreenCanvasCtx.measureText(CHAR);

  // Draw baseline
  offScreenCanvasCtx.beginPath();
  offScreenCanvasCtx.moveTo(SX, SY);
  offScreenCanvasCtx.lineTo(SX + 100, SY);
  offScreenCanvasCtx.closePath();
  offScreenCanvasCtx.strokeStyle = "green";
  offScreenCanvasCtx.stroke();

  offScreenCanvasCtx.beginPath();
  offScreenCanvasCtx.moveTo(SX, SY);
  offScreenCanvasCtx.lineTo(SX, SY + 100);
  offScreenCanvasCtx.closePath();
  offScreenCanvasCtx.strokeStyle = "blue";
  offScreenCanvasCtx.stroke();

  // Calculate glyph bounding rect
  const gx = SX - metrics.actualBoundingBoxLeft;
  const gy = SY - metrics.actualBoundingBoxAscent;
  const gw = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const gh = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  // Draw glyph bounding rect
  offScreenCanvasCtx.strokeStyle = "red";
  offScreenCanvasCtx.strokeRect(gx, gy, gw, gh);

  offScreenCanvasCtx.fillStyle = FONT.color;
  offScreenCanvasCtx.fillText(CHAR, SX, SY);

  //onScreenCanvasCtx.drawImage(offScreenCanvas, 0, 0, 100, 100, 0, 0, 100, 100);
  onScreenCanvasCtx.drawImage(offScreenCanvas, gx, gy, gw, gh, DX, DY, gw, gh);
}

function getContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate context");
  }

  return ctx;
}
