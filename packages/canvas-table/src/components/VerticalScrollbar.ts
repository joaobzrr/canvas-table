import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { TableState, Rect } from "../core";
import { Utils } from "../Utils";
import { Theme, VectorLike } from "../types";
import { Line } from "./Line";
import { MIN_THUMB_LENGTH } from "../constants";

export interface VerticalScrollbarConfig extends GroupConfig {
  tableState: TableState;
  onDragThumb: (scrollPosition: VectorLike) => void;
}

export class VerticalScrollbar extends Konva.Group {
  private tableState: TableState;
  private onDragThumb: (scrollPosition: VectorLike) => void;

  private bar:   Konva.Rect;
  private thumb: Konva.Rect;
  private track: Rect;

  private leftBorder:   Line;
  private topBorder:    Line;
  private bottomBorder: Line;

  private maxThumbTop = 0;

  constructor(config: VerticalScrollbarConfig) {
    super(config);

    this.tableState = config.tableState;
    this.onDragThumb = config.onDragThumb;

    const theme = this.tableState.getTheme();

    this.bar = new Konva.Rect({
      fill: theme.scrollBarTrackColor,
    });
    this.add(this.bar);

    this.track = Rect.create();

    this.thumb = new Konva.Rect({
      fill: theme.scrollBarThumbColor,
      draggable: true
    });
    this.thumb.on("dragmove", this.dragThumb.bind(this))

    this.add(this.thumb);

    this.leftBorder = new Line();
    this.add(this.leftBorder);

    this.topBorder = new Line();
    this.add(this.topBorder);

    this.bottomBorder = new Line();
    this.add(this.bottomBorder);
  }

  public reflow() {
    this.bar.setAttrs({ width: this.width(), height: this.height() });

    const theme = this.getAttr("theme") as Theme;

    const trackX = theme.scrollBarTrackMargin + 1;
    const trackY = this.bar.y() + theme.scrollBarTrackMargin;
    const trackWidth  = this.bar.width()  - trackX - theme.scrollBarTrackMargin;
    const trackHeight = this.bar.height() - (theme.scrollBarTrackMargin * 2);

    this.track.set({
      x: trackX,
      y: trackY,
      width: trackWidth,
      height: trackHeight
    });

    const { height: viewportHeight } = this.tableState.getViewportDimensions();
    const { height: scrollHeight } = this.tableState.getScrollDimensions();

    let thumbHeight = (viewportHeight / scrollHeight) * this.track.height;
    thumbHeight = Math.max(thumbHeight, MIN_THUMB_LENGTH);

    this.thumb.setAttrs({
      x: this.track.x,
      width: this.track.width,
      height: thumbHeight,
    });

    this.maxThumbTop = this.track.bottom - this.thumb.height();

    this.leftBorder.setAttrs({
      y: this.bar.y(),
      width: 1,
      height: this.height(),
      fill: theme.tableBorderColor
    });
    
    this.topBorder.setAttrs({
      y: this.bar.y(),
      width: this.width(),
      height: 1,
      fill: theme.tableBorderColor
    });

    this.bottomBorder.setAttrs({
      y: this.height(),
      width: this.width(),
      height: 1,
      fill: theme.tableBorderColor,
    });
  }

  public repaint() {
    const theme = this.getAttr("theme") as Theme;

    this.leftBorder.fill(theme.tableBorderColor);
    this.topBorder.fill(theme.tableBorderColor);
    this.bottomBorder.fill(theme.tableBorderColor);

    const normalizedScrollTop = this.tableState.getNormalizedScrollPosition().y;
    const minY = this.track.y;
    const maxY = this.maxThumbTop;
    const thumbTop = Utils.scale(normalizedScrollTop, 0, 1, minY, maxY);
    this.thumb.y(thumbTop);
  }

  private dragThumb() {
    // @Note Reset x coordinate
    this.thumb.x(this.track.x);

    const minY = this.track.y;
    const maxY = this.maxThumbTop;

    if (this.thumb.y() < minY) {
      this.thumb.y(minY);
    } else if (this.thumb.y() > maxY) {
      this.thumb.y(maxY);
    }

    const maxScrollTop = this.tableState.getMaximumScrollPosition().y;
    const scrollTop = Utils.scale(this.thumb.y(), minY, maxY, 0, maxScrollTop);
    const scrollLeft = this.tableState.getScrollPosition().x;
    this.onDragThumb({ x: scrollLeft, y: scrollTop });
  }
}
