import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { TableState } from "./TableState";
import { Utils } from "./Utils";
import { Theme } from "./types";
import { NodeManager } from "./NodeManager";
import { Line } from "./Line";

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
  track: Konva.Rect;
  thumb: Konva.Rect;

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

    this.track = new Konva.Rect();
    this.add(this.track);

    this.thumb = new Konva.Rect({
      fill: this.theme.scrollBarThumbColor
    });
    this.add(this.thumb);

    this.borderGroup = new Konva.Group();
    this.add(this.borderGroup);

    this.on("widthChange heightChange", this.onResize.bind(this));
  }

  onResize() {
    const { height: viewportHeight } = this.tableState.viewportDimensions;
    const { height: scrollHeight } = this.tableState.scrollDimensions;

    const barY = this.theme.rowHeight;
    const barWidth = this.theme.scrollBarThickness;
    const barHeight = this.height() - this.theme.rowHeight;

    this.bar.setAttrs({
      x: 0,
      y: this.theme.rowHeight,
      width: barWidth,
      height: barHeight,
    });

    const trackX = this.theme.scrollBarTrackMargin + 1;
    const trackY = barY + this.theme.scrollBarTrackMargin;
    const trackWidth  = barWidth  - trackX - this.theme.scrollBarTrackMargin;
    const trackHeight = barHeight - (this.theme.scrollBarTrackMargin * 2);

    this.track.setAttrs({
      x: trackX,
      y: trackY,
      width: trackWidth,
      height: trackHeight
    });

    const thumbHeight = (viewportHeight / scrollHeight) * trackHeight;

    this.thumb.setAttrs({
      x: trackX,
      y: trackY,
      width: trackWidth,
      height: thumbHeight,
    });

    const trackBottom = trackY + trackHeight;
    this.maxThumbTop = trackBottom - thumbHeight;

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
      y: barY,
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

    this.repositionThumb();
  }

  onWheel() {
    this.repositionThumb();
  }

  repositionThumb() {
    const { y: normalizedScrollTop } = this.tableState.normalizedScrollPosition;
    this.thumb.y(Utils.scale(normalizedScrollTop, 0, 1, this.track.y(), this.maxThumbTop));
  }
}
