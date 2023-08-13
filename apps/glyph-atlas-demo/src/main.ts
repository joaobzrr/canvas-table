import { GlyphAtlas } from "glyph-atlas";

function main() {
  const glyphAtlas = new GlyphAtlas();

  /*
  const chars = [];
  for (let i = 33; i < 255; i++) {
    chars.push(String.fromCharCode(i));
  }

  for (const char of chars) {
    glyphAtlas.getGlyphBitmapRect(char, "Courier New", "32px", "normal");
  }

  for (const char of chars.slice(0, 126)) {
    glyphAtlas.getGlyphBitmapRect(char, "Arial", "32px", "bold");
  }
  */

  const body = document.querySelector("body")!;

  glyphAtlas.canvas.style.border = "1px solid black";
  body.appendChild(glyphAtlas.canvas);

  const screenCanvasWidth  = 512;
  const screenCanvasHeight = 512;
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width  = screenCanvasWidth;
  screenCanvas.height = screenCanvasHeight;
  screenCanvas.style.border = "1px solid black";
  body.appendChild(screenCanvas);

  const ctx = screenCanvas.getContext("2d")!;

  const fontFamily = "Arial";
  const fontSize = "20px";
  const fontStyle = "normal";

  const text = "abcdefghijklmnopqrstuvwxyzé";
  let originX = 0;
  let originY = 100;

  ctx.beginPath();
  ctx.moveTo(0, originY);
  ctx.lineTo(screenCanvasWidth, originY);
  ctx.closePath();

  ctx.strokeStyle = "red";
  ctx.stroke();

  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const glyphData = glyphAtlas.getGlyphData(char, fontFamily, fontSize, fontStyle);
    const glyphRect = glyphData.rect;

    const x = originX;
    const y = originY - glyphData.actualBoundingBoxAscent;

    ctx.drawImage(
      glyphAtlas.canvas,
      glyphRect.x, glyphRect.y, glyphRect.width, glyphRect.height,
      x, y, glyphRect.width, glyphRect.height);

    originX += glyphData.rect.width;
  }
}

main();
