import { Renderer } from '@bzrr/canvas-table-core';

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;
const ATLAS_WIDTH = 320;
const ATLAS_HEIGHT = 240;

const FONT_FAMILY = 'Arial';
const FONT_SIZE = 40;
const FONT = `${FONT_SIZE}px ${FONT_FAMILY}`;
const TEXT = '😯😨😗😲😇💩😂🤬🤡😎🥳😝👨‍👧🔴🤢👽';
const TEXT_X = 0;

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error("Element with id 'root' was not found");
}

const canvas = document.createElement('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.style.border = '1px solid black';
rootEl.appendChild(canvas);
const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Could not instantiate canvas context');
}

const renderer = new Renderer({
  ctx,
  glyphAtlasParams: {
    width: ATLAS_WIDTH,
    height: ATLAS_HEIGHT,
  },
});
renderer.textRenderer.glyphAtlas.canvas.style.border = '1px solid black';
renderer.textRenderer.glyphAtlas.canvas.style.marginLeft = '10px';
rootEl.appendChild(renderer.textRenderer.glyphAtlas.canvas);

ctx.imageSmoothingEnabled = false;

ctx.font = FONT;
const { fontBoundingBoxAscent, fontBoundingBoxDescent } = ctx.measureText('M');
const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
const baselineY = Math.floor((CANVAS_HEIGHT - fontHeight) / 2 + fontBoundingBoxAscent);

//const {
//  actualBoundingBoxAscent,
//  actualBoundingBoxDescent,
//  actualBoundingBoxLeft,
//  actualBoundingBoxRight,
//} = ctx.measureText(TEXT);

// renderer.pushDrawCommand({
//   type: "line",
//   orientation: "horizontal",
//   x: 0,
//   y: baselineY,
//   length: CANVAS_WIDTH,
//   color: "red"
// })
//
// renderer.pushDrawCommand({
//   type: "line",
//   orientation: "horizontal",
//   x: 0,
//   y: baselineY - actualBoundingBoxAscent,
//   length: CANVAS_WIDTH,
//   color: "lightgreen"
// })
//
// renderer.pushDrawCommand({
//   type: "line",
//   orientation: "horizontal",
//   x: 0,
//   y: baselineY + actualBoundingBoxDescent,
//   length: CANVAS_WIDTH,
//   color: "blue"
// })
//
// renderer.pushDrawCommand({
//   type: "line",
//   orientation: "vertical",
//   x: TEXT_X + actualBoundingBoxLeft,
//   y: 0,
//   length: CANVAS_HEIGHT,
//   color: "purple"
// })
//
// renderer.pushDrawCommand({
//   type: "line",
//   orientation: "vertical",
//   x: TEXT_X + actualBoundingBoxRight,
//   y: 0,
//   length: CANVAS_HEIGHT,
//   color: "orange"
// })
//
renderer.pushDrawCommand({
  type: 'text',
  x: TEXT_X,
  y: baselineY,
  chars: [],
  subpixelOffsets: [],
  font: FONT,
  color: 'black',
});

renderer.render();

ctx.fillStyle = '#555555';
ctx.fillText(TEXT, TEXT_X, baselineY + fontHeight);
