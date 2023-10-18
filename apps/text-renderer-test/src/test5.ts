import * as TextRenderer from "./text-renderer";

export function test5() {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Could not find element with id 'root'");
  }

  const renderer = TextRenderer.create({ atlasWidth: 400, atlasHeight: 400 });
  renderer.glyphAtlas.canvas.style.marginRight = "10px";
  renderer.glyphAtlas.canvas.style.border = "1px solid black";
  root.appendChild(renderer.glyphAtlas.canvas);

  const canvas = document.createElement("canvas");
  canvas.style.border = "1px solid black";
  root.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }

  ctx.imageSmoothingEnabled = false;

  const fontSize = 16;
  const font = `${fontSize}px Tahoma`;

  const x = 10;
  const y = 50;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 200, y)
  ctx.closePath();
  ctx.strokeStyle = "red";
  ctx.stroke();

  const text = "Hello";

  ctx.font = font;
  ctx.fillStyle = "green";
  ctx.fillText(text, x, y);

  TextRenderer.setFont(renderer, font);
  TextRenderer.setColor(renderer, "black");

  TextRenderer.render(renderer, ctx, text, x + 100, y);

}
