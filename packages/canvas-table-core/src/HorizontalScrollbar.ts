import Konva from "konva";
import { throttle } from "lodash";
import { CanvasTable } from "./CanvasTable";
import { ScrollEvent } from "./events";
import { scale } from "./utils";
import { MIN_THUMB_LENGTH } from "./constants";
import { VectorLike } from "./types";

export class HorizontalScrollbar extends Konva.Group {
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

    const { scrollBarThumbColor } = this.ct.getTheme();

    this.bar = new Konva.Rect();
    this.add(this.bar);

    this.thumb = new Konva.Rect({
      fill: scrollBarThumbColor,
      draggable: true
    });
    this.add(this.thumb);

    this.thumb.on("dragmove", this.dragThumb.bind(this));
    this.on("widthChange heightChange", this.onReflow.bind(this));

    this.setNormalizedScrollPos = throttle(this.setNormalizedScrollPos.bind(this), 16);
  }

  private onReflow() {
    this.reflow();
  }

  private onThemeChanged() {
    const { scrollBarThumbColor } = this.ct.getTheme();
    this.thumb.fill(scrollBarThumbColor);

    this.reflow();
  }

  public onScroll(event: Event) {
    const { normalizedPos } = (event as ScrollEvent).detail;
    this.thumb.x(this.calcThumbPos(normalizedPos.x));
  }

  private reflow() {
    const {
      normalizedScrollPos,
      normalizedViewportSize,
      hsbInnerArea,
      overflow
    } = this.ct.getState();

    const { scrollBarTrackMargin } = this.ct.getTheme();

    this.visible(overflow.x);
    if (!this.visible()) {
      return;
    }

    this.setAttrs(hsbInnerArea);

    this.bar.width(this.width());
    this.bar.height(this.height())

    this.trackRect.x = scrollBarTrackMargin;
    this.trackRect.y = scrollBarTrackMargin;
    this.trackRect.width = this.bar.width() - (scrollBarTrackMargin * 2);
    this.trackRect.height = this.bar.height() - this.trackRect.y - scrollBarTrackMargin;

    const { width: normalizedSize } = normalizedViewportSize;
    const thumbWidth = this.calcThumbSize(normalizedSize);
    this.thumb.width(thumbWidth);

    this.maxThumbPos = this.trackRect.x + this.trackRect.width - thumbWidth;

    const { x: normalizedPos } = normalizedScrollPos;
    const thumbX = this.calcThumbPos(normalizedPos);
    this.thumb.x(thumbX);

    this.thumb.height(this.trackRect.height);
    this.thumb.y(this.trackRect.y);
  }

  private dragThumb() {
    this.thumb.y(this.trackRect.y); // Reset y-coordinate

    const minX = this.trackRect.x;
    const maxX = this.maxThumbPos;

    if (this.thumb.x() < minX) {
      this.thumb.x(minX);
    } else if (this.thumb.x() > maxX) {
      this.thumb.x(maxX);
    }

    const scrollLeft = scale(this.thumb.x(), minX, maxX, 0, 1);
    const { normalizedScrollPos } = this.ct.getState();
    this.setNormalizedScrollPos({ x: scrollLeft, y: normalizedScrollPos.y }); 
  }

  private calcThumbPos(normalizedPos: number) {
    return scale(normalizedPos, 0, 1, this.trackRect.x, this.maxThumbPos);
  }

  private calcThumbSize(normalizedSize: number) {
    return Math.max(normalizedSize * this.trackRect.width, MIN_THUMB_LENGTH);
  }

  private setNormalizedScrollPos(pos: VectorLike) {
    this.ct.setNormalizedScrollPos(pos);
  }
}
