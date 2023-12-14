export function getFontMetrics(ctx: CanvasRenderingContext2D, font: string) {
  ctx.save();

  ctx.font = font;
  const { fontBoundingBoxAscent, fontBoundingBoxDescent } = ctx.measureText("M");

  ctx.restore();

  return {
    fontBoundingBoxAscent,
    fontBoundingBoxDescent
  };
}
