import { makeFontSpecifier } from "./utils";

export function test3() {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }

  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.style.marginRight = "10px";
  atlasCanvas.style.border = "1px solid black";
  root.appendChild(atlasCanvas);

  const onScreenCanvas = document.createElement("canvas");
  onScreenCanvas.style.border = "1px solid black";
  root.appendChild(onScreenCanvas);

  const atlasCanvasCtx = atlasCanvas.getContext("2d");
  if (!atlasCanvasCtx) {
    throw new Error("Could not instantiate canvas context");
  }

  const onScreenCanvasCtx = onScreenCanvas.getContext("2d");
  if (!onScreenCanvasCtx) {
    throw new Error("Could not instantiate canvas context");
  }

  onScreenCanvasCtx.imageSmoothingEnabled = false;

  const font = {
    family: "Arial",
    size: 20,
    style: "normal" as const,
    color: "black"
  };

  const fontSpecifier = makeFontSpecifier(font.family, font.size, font.style);
  atlasCanvasCtx.font = fontSpecifier;
  onScreenCanvasCtx.font = fontSpecifier;

  const text = "Hello, World!";
  const atlasTextStartX = 10;
  const atlasTextBaselineY = 50;
  const sourceTextStartX = 10;
  const sourceTextBaselineY = 40;
  const padding = 1;

  // Draw baseline
  //atlasCanvasCtx.strokeStyle = "green";
  //atlasCanvasCtx.beginPath();
  //atlasCanvasCtx.moveTo(atlasTextStartX, atlasTextBaselineY);
  //atlasCanvasCtx.lineTo(atlasTextStartX + 100, atlasTextBaselineY);
  //atlasCanvasCtx.closePath();
  //atlasCanvasCtx.stroke();

  let sourceAccumWidth = 0;
  let destAccumWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const metrics = atlasCanvasCtx.measureText(char);

    const atlasTextX = atlasTextStartX + sourceAccumWidth;

    const glyphBoundingRectX = atlasTextX - metrics.actualBoundingBoxLeft;
    const glyphBoundingRectY = atlasTextBaselineY - metrics.actualBoundingBoxAscent;
    const glyphWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    atlasCanvasCtx.fillText(char, atlasTextX, atlasTextBaselineY);

    const blitRectX = Math.floor(glyphBoundingRectX - padding);
    const blitRectY = Math.floor(glyphBoundingRectY - padding);

    const deltaX = glyphBoundingRectX - blitRectX;
    const deltaY = glyphBoundingRectY - blitRectY;

    const blitRectWidth  = Math.ceil(glyphWidth  + (padding * 2) + deltaX);
    const blitRectHeight = Math.ceil(glyphHeight + (padding * 2) + deltaY);

    // atlasCanvasCtx.strokeStyle = "red";
    // atlasCanvasCtx.strokeRect(blitRectX, blitRectY, blitRectWidth, blitRectHeight);

    const sourceTextX = sourceTextStartX + destAccumWidth - deltaX - metrics.actualBoundingBoxLeft;
    const sourceTextY = sourceTextBaselineY - metrics.actualBoundingBoxAscent - deltaY;

    console.log(blitRectX, blitRectY, sourceTextX, sourceTextY);

    onScreenCanvasCtx.drawImage(atlasCanvas, blitRectX, blitRectY, blitRectWidth, blitRectHeight, sourceTextX, sourceTextY, blitRectWidth, blitRectHeight);

    sourceAccumWidth += blitRectWidth;
    destAccumWidth += metrics.width;
  }

  onScreenCanvasCtx.fillText(text, sourceTextStartX, sourceTextBaselineY + 20);


  // atlasCanvasCtx.beginPath();
  // atlasCanvasCtx.moveTo(atlasTextDrawX, atlasTextBaselineY - 100);
  // atlasCanvasCtx.lineTo(atlasTextDrawX, atlasTextBaselineY + 100);
  // atlasCanvasCtx.closePath();
  // atlasCanvasCtx.strokeStyle = "green";
  // atlasCanvasCtx.stroke();

  // atlasCanvasCtx.beginPath();
  // atlasCanvasCtx.moveTo(atlasTextLeft, atlasTextBaselineY - 100);
  // atlasCanvasCtx.lineTo(atlasTextLeft, atlasTextBaselineY + 100);
  // atlasCanvasCtx.closePath();
  // atlasCanvasCtx.strokeStyle = "blue";
  // atlasCanvasCtx.stroke();
}
