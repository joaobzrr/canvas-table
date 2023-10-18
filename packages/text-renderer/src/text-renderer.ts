import * as Atlas from "./glyph-atlas";
import { TextRenderer, GlyphAtlasParams } from "./types";

import Graphemer from "graphemer";

// ---------- Code ----------
export function create(params?: Partial<GlyphAtlasParams>): TextRenderer {
  const glyphAtlas = Atlas.create(params);
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

  // Take this out of here
  y += Math.floor(glyphAtlas.fontHeight);

  let availableContentWidth = maxWidth;
  if (ellipsis && maxWidth !== Infinity) {
    const { advance } = Atlas.getGlyphMetrics(glyphAtlas, ".");
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
    } = Atlas.getGlyphMetrics(glyphAtlas, grapheme);

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
    } = Atlas.getGlyphMetrics(glyphAtlas, ".");

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
  Atlas.setFont(renderer.glyphAtlas, font);
}

export function setColor(renderer: TextRenderer, color: string) {
  renderer.glyphAtlas.color = color;
}

export function clearAtlas(renderer: TextRenderer) {
  Atlas.clear(renderer.glyphAtlas);
}
