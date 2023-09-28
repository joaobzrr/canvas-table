import Konva from "konva";
import { CanvasTable } from "./CanvasTable";
import { throttle } from "./utils";
import { ScrollEvent } from "./events";
import { scale } from "./utils";
import { MIN_THUMB_LENGTH } from "./constants";
import { VectorLike } from "./types";

export class VerticalScrollbar extends Konva.Group {
  private ct: CanvasTable;

  // @Todo: Remove this unless we use it later for detecting when
  // the user clicks the scrollbar track?
  private bar: Konva.Rect;

  private thumb: Konva.Rect;

  private trackRect = { x: 0, y: 0, width: 1, height: 1 };
  private maxThumbPos = 0;

  constructor(ct: CanvasTable) {
    super();

    this.ct = ct;
    this.ct.addEventListener("reflow", this.onReflow.bind(this));
    this.ct.addEventListener("themeChanged", this.onThemeChanged.bind(this));
    this.ct.addEventListener("scroll", this.onScroll.bind(this));

    const { scrollbarThumbColor } = this.ct.getTheme();

    this.bar = new Konva.Rect();
    this.add(this.bar);

    this.thumb = new Konva.Rect({ fill: scrollbarThumbColor, draggable: true });
    this.add(this.thumb);

    this.thumb.on("dragmove", this.dragThumb.bind(this));

    this.setNormalizedScrollPos = throttle(this.setNormalizedScrollPos.bind(this), 16);
  }

  private onReflow() {
    this.reflow();
  }

  private onThemeChanged() {
    const { scrollbarThumbColor } = this.ct.getTheme();
    this.thumb.fill(scrollbarThumbColor);

    this.reflow();
  }

  private onScroll(event: Event) {
    const { normalizedPos } = (event as ScrollEvent).detail;
    this.thumb.y(this.calcThumbPos(normalizedPos.y));
  }

  private reflow() {
    const {
      normalizedScrollPos,
      normalizedViewportSize,
      vsbInnerArea,
      overflow
    } = this.ct.getState();

    const { scrollbarThickness, scrollbarTrackMargin } = this.ct.getTheme();

    this.visible(overflow.y);
    if (!this.visible()) {
      return;
    }

    this.setAttrs(vsbInnerArea);

    this.bar.width(scrollbarThickness);
    this.bar.height(this.height());

    this.trackRect.x = scrollbarTrackMargin;
    this.trackRect.y = this.bar.y() + scrollbarTrackMargin;
    this.trackRect.width  = this.bar.width()  - (scrollbarTrackMargin * 2);
    this.trackRect.height = this.bar.height() - (scrollbarTrackMargin * 2);

    const { height: normalizedSize } = normalizedViewportSize;
    const thumbHeight = this.calcThumbSize(normalizedSize);
    this.thumb.height(thumbHeight);

    this.maxThumbPos = this.trackRect.y + this.trackRect.height - thumbHeight;

    const { y: normalizedPos } = normalizedScrollPos;
    const thumbY = this.calcThumbPos(normalizedPos);
    this.thumb.y(thumbY);

    this.thumb.width(this.trackRect.width);
    this.thumb.x(this.trackRect.x);
  }

  private dragThumb() {
    this.thumb.x(this.trackRect.x); // Reset x-coordinate

    const minY = this.trackRect.y;
    const maxY = this.maxThumbPos;

    if (this.thumb.y() < minY) {
      this.thumb.y(minY);
    } else if (this.thumb.y() > maxY) {
      this.thumb.y(maxY);
    }

    const scrollTop = scale(this.thumb.y(), minY, maxY, 0, 1);
    const { normalizedScrollPos } = this.ct.getState();
    this.setNormalizedScrollPos({ x: normalizedScrollPos.x, y: scrollTop });
  }

  private calcThumbPos(normalizedPos: number) {
    return scale(normalizedPos, 0, 1, this.trackRect.y, this.maxThumbPos);
  }

  private calcThumbSize(normalizedSize: number) {
    return Math.max(normalizedSize * this.trackRect.height, MIN_THUMB_LENGTH);
  }

  private setNormalizedScrollPos(pos: VectorLike) {
    this.ct.setNormalizedScrollPos(pos);
  }
}
