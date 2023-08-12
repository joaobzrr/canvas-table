import { GlyphAtlas } from "glyph-atlas";

const glyphAtlas = new GlyphAtlas();

const chars = [];
for (let i = 33; i < 255; i++) {
  chars.push(String.fromCharCode(i));
}

for (const char of chars) {
  glyphAtlas.cacheGlyph(char, "Courier New", "32px");
}

for (const char of chars.slice(0, 128)) {
  glyphAtlas.cacheGlyph(char, "Arial", "32px");
}

const body = document.querySelector("body");
const canvas = (glyphAtlas as any).canvas as HTMLCanvasElement;
canvas.style.border = "1px solid black";
body!.appendChild(canvas);
