import Konva from "konva";
import { throttle } from "lodash";
import { CanvasTable } from "./CanvasTable";
import { ScrollEvent } from "./events";
import { scale } from "./utils";
import { MIN_THUMB_LENGTH } from "./constants";
import { VectorLike } from "./types";

export class HorizontalScrollbar extends Konva.Group {
  private ct: CanvasTable;

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

    const { scrollBarTrackColor, scrollBarThumbColor } = this.ct.getTheme();

    this.bar = new Konva.Rect({
      fill: scrollBarTrackColor
    });
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
    const { scrollBarThumbColor, scrollBarTrackColor } = this.ct.getTheme();

    this.bar.fill(scrollBarTrackColor!);
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
      bodyArea,
      overflow
    } = this.ct.getTableState();

    const {
      scrollBarThickness,
      scrollBarTrackMargin
    } = this.ct.getTheme();

    const tableSize = this.ct.getSize();

    this.visible(overflow.x);
    if (!this.visible()) {
      return;
    }

    this.y(tableSize.height - scrollBarThickness);
    this.width(bodyArea.width);

    this.bar.width(this.width());
    this.bar.height(scrollBarThickness)

    this.trackRect.x = scrollBarTrackMargin;
    this.trackRect.y = scrollBarTrackMargin + 1;
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
    const { normalizedScrollPos } = this.ct.getTableState();
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
