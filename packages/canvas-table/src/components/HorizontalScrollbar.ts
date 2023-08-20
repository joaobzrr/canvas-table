import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { TableState, Rect } from "../core";
import { Utils } from "../Utils";
import { Theme, VectorLike } from "../types";
import { Line } from "./Line";
import { MIN_THUMB_LENGTH } from "../constants";

export interface HorizontalScrollbarConfig extends GroupConfig {
  tableState: TableState;
  onDragThumb: (scrollPosition: VectorLike) => void;
}

export class HorizontalScrollbar extends Konva.Group {
  private tableState: TableState;
  private onDragThumb: (scrollPosition: VectorLike) => void;

  private bar:   Konva.Rect;
  private thumb: Konva.Rect;
  private track: Rect;

  private topBorder:   Line;
  private rightBorder: Line;

  private maxThumbLeft = 0;

  constructor(config: HorizontalScrollbarConfig) {
    super(config);

    this.tableState = config.tableState;
    this.onDragThumb = config.onDragThumb;

    const theme = this.tableState.getTheme();

    this.bar = new Konva.Rect({ fill: theme.scrollBarTrackColor });
    this.add(this.bar);

    this.track = Rect.create();

    this.thumb = new Konva.Rect({
      fill: theme.scrollBarThumbColor,
      draggable: true
    });
    this.thumb.on("dragmove", this.dragThumb.bind(this));
    this.add(this.thumb);

    this.topBorder = new Line();
    this.add(this.topBorder);

    this.rightBorder = new Line();
    this.add(this.rightBorder);
  }

  public reflow() {
    const theme = this.getAttr("theme") as Theme;

    const barHeight = theme.scrollBarThickness;
    const barWidth = this.width();

    this.bar.setAttrs({
      x: 0,
      y: 0,
      width: barWidth,
      height: barHeight
    });

    const trackX = theme.scrollBarTrackMargin;
    const trackY = theme.scrollBarTrackMargin + 1;
    const trackWidth  = this.bar.width()  - (theme.scrollBarTrackMargin * 2);
    const trackHeight = this.bar.height() - trackY - theme.scrollBarTrackMargin;

    this.track.set({
      x: trackX,
      y: trackY,
      width: trackWidth,
      height: trackHeight
    });

    const { width: viewportWidth } = this.tableState.getViewportDimensions();
    const { width: scrollWidth } = this.tableState.getScrollDimensions();

    let thumbWidth = (viewportWidth / scrollWidth) * this.track.width;
    thumbWidth = Math.max(thumbWidth, MIN_THUMB_LENGTH);

    this.thumb.setAttrs({
      y: this.track.y,
      width: thumbWidth,
      height: this.track.height
    });

    this.maxThumbLeft = this.track.right - this.thumb.width();

    this.topBorder.setAttrs({
      width: this.width(),
      height: 1,
      fill: theme.tableBorderColor,
    });

    this.rightBorder.setAttrs({
      x: this.width(),
      width: 1,
      height: this.height(),
      fill: theme.tableBorderColor,
    });
  }

  public repaint() {
    const theme = this.getAttr("theme") as Theme;

    this.topBorder.fill(theme.tableBorderColor);
    this.rightBorder.fill(theme.tableBorderColor);

    const normalizedScrollLeft = this.tableState.getNormalizedScrollPosition().x;
    const minX = this.track.x;
    const maxX = this.maxThumbLeft;
    const thumbLeft = Utils.scale(normalizedScrollLeft, 0, 1, minX, maxX);
    this.thumb.x(thumbLeft);
  }

  private dragThumb() {
    // @Note Reset y coordinate
    this.thumb.y(this.track.y)

    const minX = this.track.x;
    const maxX = this.maxThumbLeft;

    if (this.thumb.x() < minX) {
      this.thumb.x(minX);
    } else if (this.thumb.x() > maxX) {
      this.thumb.x(maxX);
    }

    const maxScrollLeft = this.tableState.getMaximumScrollPosition().x;
    const scrollLeft = Utils.scale(this.thumb.x(), minX, maxX, 0, maxScrollLeft);
    const scrollTop = this.tableState.getScrollPosition().y;
    this.onDragThumb({ x: scrollLeft, y: scrollTop });
  }
}
