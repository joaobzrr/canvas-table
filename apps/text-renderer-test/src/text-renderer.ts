// ---------- Types ----------
import * as GlyphAtlas from "./glyph-atlas";

type TextRenderer = {
  glyphAtlas: GlyphAtlas.GlyphAtlas;
}

import Graphemer from "graphemer";

// ---------- Code ----------
export function create(params?: Partial<GlyphAtlas.GlyphAtlasParams>): TextRenderer {
  const glyphAtlas = GlyphAtlas.create(params);
  return { glyphAtlas };
}

export function render(
  renderer: TextRenderer,
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  maxWidth = Infinity,
  ellipsis = false
) {
  const { glyphAtlas } = renderer;

  let availableContentWidth = maxWidth;
  if (ellipsis && maxWidth !== Infinity) {
    const { advance } = GlyphAtlas.getGlyphMetrics(glyphAtlas, ".");
    const ellipsisAdvance = advance * 3;
    availableContentWidth = Math.max(maxWidth - ellipsisAdvance, 0);
  }

  let usedWidth = 0;
  let stringIndex = 0;
  let doEllipsis = false;

  for (;;) {
    const nextStringIndex = Graphemer.nextBreak(str, stringIndex);
    if (nextStringIndex === stringIndex) {
      break;
    }
    const grapheme = str.slice(stringIndex, nextStringIndex);
    stringIndex = nextStringIndex;

    const {
      sx,
      sy,
      sw,
      sh,
      hshift,
      vshift,
      advance
    } = GlyphAtlas.getGlyphMetrics(glyphAtlas, grapheme);

    if (usedWidth + advance > availableContentWidth) {
      doEllipsis = true;
      break;
    }

    const dx = x + usedWidth - hshift;
    const dy = y - vshift;

    ctx.drawImage(glyphAtlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);

    usedWidth += advance;
  }

  if (doEllipsis) {
    const {
      sx,
      sy,
      sw,
      sh,
      hshift,
      vshift,
      advance
    } = GlyphAtlas.getGlyphMetrics(glyphAtlas, ".");

    const dy = y - vshift;

    for (let i = 0; i < 3; i++) {
      if (usedWidth + advance > maxWidth) {
        break;
      }

      const dx = x + usedWidth - hshift;

      ctx.drawImage(glyphAtlas.canvas, sx, sy, sw, sh, dx, dy, sw, sh);

      usedWidth += advance;
    }
  }
}

export function setFont(renderer: TextRenderer, font: string) {
  GlyphAtlas.setFont(renderer.glyphAtlas, font);
}

export function setColor(renderer: TextRenderer, color: string) {
  renderer.glyphAtlas.color = color;
}

export function clearAtlas(renderer: TextRenderer) {
  GlyphAtlas.clear(renderer.glyphAtlas);
}
