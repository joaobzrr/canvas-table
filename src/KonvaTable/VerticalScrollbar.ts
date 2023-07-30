import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { TableState } from "./TableState";
import { Utils } from "./Utils";
import { Line } from "./Line";
import { Rect } from "./Rect";
import { NodeManager } from "./NodeManager";
import { Theme } from "./types";

export interface VerticalScrollbarConfig extends GroupConfig {
  tableState: TableState;
  nodeManager: NodeManager;
  theme: Theme;
}

export class VerticalScrollbar extends Konva.Group {
  tableState: TableState;
  nodeManager: NodeManager;
  theme: Theme;

  bar:   Konva.Rect;
  thumb: Konva.Rect;
  track: Rect;

  borderGroup: Konva.Group;

  maxThumbTop = 0;

  constructor(config: VerticalScrollbarConfig) {
    super(config);

    this.tableState = config.tableState;
    this.theme = config.theme;

    this.nodeManager = config.nodeManager;

    this.bar = new Konva.Rect({
      fill: this.theme.scrollBarTrackColor,
    });
    this.add(this.bar);

    this.track = Rect.create();

    this.thumb = new Konva.Rect({
      fill: this.theme.scrollBarThumbColor
    });
    this.add(this.thumb);

    this.borderGroup = new Konva.Group();
    this.add(this.borderGroup);

    this.on("widthChange heightChange", this.onResize.bind(this));
  }

  onResize() {
    this.updateBar();
    this.updateTrack();
    this.updateThumb();
    this.updateBorders();
    this.repositionThumb();
  }

  onWheel() {
    this.repositionThumb();
  }

  updateBar() {
    const barWidth = this.theme.scrollBarThickness;
    const barHeight = this.height() - this.theme.rowHeight;

    this.bar.setAttrs({
      x: 0,
      y: this.theme.rowHeight,
      width: barWidth,
      height: barHeight,
    })
  }

  updateTrack() {
    const trackX = this.theme.scrollBarTrackMargin + 1;
    const trackY = this.bar.y() + this.theme.scrollBarTrackMargin;
    const trackWidth  = this.bar.width()  - trackX - this.theme.scrollBarTrackMargin;
    const trackHeight = this.bar.height() - (this.theme.scrollBarTrackMargin * 2);

    this.track.set({
      x: trackX,
      y: trackY,
      width: trackWidth,
      height: trackHeight
    });
  }

  updateThumb() {
    const { height: viewportHeight } = this.tableState.viewportDimensions;
    const { height: scrollHeight } = this.tableState.scrollDimensions;

    const thumbHeight = (viewportHeight / scrollHeight) * this.track.height;

    this.thumb.setAttrs({
      x: this.track.x,
      y: this.track.y,
      width: this.track.width,
      height: thumbHeight,
    });

    this.maxThumbTop = this.track.bottom - thumbHeight;
  }

  updateBorders() {
    const lines = this.borderGroup.children as Line[];
    this.borderGroup.removeChildren();
    this.nodeManager.retrieve("line", ...lines);

    const leftBorder = this.nodeManager.borrow("line");
    leftBorder.setAttrs({
      width: 1,
      height: this.height(),
      fill: this.theme.tableBorderColor
    });
    this.borderGroup.add(leftBorder);
    
    const topBorder = this.nodeManager.borrow("line");
    topBorder.setAttrs({
      y: this.bar.y(),
      width: this.width(),
      height: 1,
      fill: this.theme.tableBorderColor
    });
    this.borderGroup.add(topBorder);

    const bottomBorder = this.nodeManager.borrow("line");
    bottomBorder.setAttrs({
      y: this.height(),
      width: this.width(),
      height: 1,
      fill: this.theme.tableBorderColor,
    });
    this.borderGroup.add(bottomBorder);
  }

  repositionThumb() {
    const { y: normalizedScrollTop } = this.tableState.normalizedScrollPosition;
    this.thumb.y(Utils.scale(normalizedScrollTop, 0, 1, this.track.y, this.maxThumbTop));
  }
}
