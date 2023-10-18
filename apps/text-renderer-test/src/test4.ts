import { create, getGlyphMetrics } from "./glyph-atlas";

export function test4() {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Could not find element with id 'root'");
  }
  const atlas = create({ atlasWidth: 400, atlasHeight: 400 });

  atlas.canvas.style.border = "1px solid black";
  atlas.canvas.style.marginRight = "10px";
  root.appendChild(atlas.canvas);

  const fontSize = 40;
  const font = `${fontSize}px Arial`;
  atlas.font = font;
  atlas.color = "black";

  const canvas = document.createElement("canvas");
  canvas.style.border = "1px solid black";
  root.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }
  ctx.imageSmoothingEnabled = false;
  ctx.font = font;

  const text = "abracadabra";
  const refX = 5;
  const refY = fontSize;

  ctx.fillStyle = "green";
  ctx.fillText(text, refX, refY);

  const startX = refX;
  const baselineY = refY + fontSize;

  let x = startX;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    const {
      sx,
      sy,
      sw,
      sh,
      hshift,
      vshift,
      advance
    } = getGlyphMetrics(atlas, char);

    const dx = x - hshift;
    const dy = baselineY - vshift;

    ctx.drawImage(atlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);

    x += advance;
  }
}
