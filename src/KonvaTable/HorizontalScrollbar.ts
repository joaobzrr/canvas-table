import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { TableState } from "./TableState";
import { NodeManager } from "./NodeManager";
import { Utils } from "./Utils";
import { Theme } from "./types";

export interface HorizontalScrollbarConfig extends GroupConfig {
  tableState: TableState;
  theme:      Theme

  nodeManager: NodeManager;
}

export class HorizontalScrollbar extends Konva.Group {
  tableState: TableState;
  theme:      Theme;

  nodeManager: NodeManager;

  bar:   Konva.Rect;
  track: Konva.Rect;
  thumb: Konva.Rect;

  borders: Konva.Group;

  maxThumbLeft = 0;

  constructor(config: HorizontalScrollbarConfig) {
    super(config);

    this.tableState = config.tableState;
    this.theme = config.theme;

    this.nodeManager = config.nodeManager;

    this.bar = new Konva.Rect({
      fill: this.theme.scrollBarTrackColor,
      strokeWidth: 1
    });
    this.add(this.bar);

    this.track = new Konva.Rect();
    this.add(this.track);

    this.thumb = new Konva.Rect({
      fill: this.theme.scrollBarThumbColor
    });
    this.add(this.thumb);

    this.borders = new Konva.Group();
    this.add(this.borders);

    this.on("widthChange heightChange", this.onResize.bind(this));
  }

  onResize() {
    const { width: viewportWidth } = this.tableState.viewportDimensions;
    const { width: scrollWidth } = this.tableState.scrollDimensions;

    const barHeight = this.theme.scrollBarThickness;

    const barWidth = this.width();

    this.bar.setAttrs({
      x: 0,
      y: 0,
      width: barWidth,
      height: barHeight
    });

    const trackX = this.theme.scrollBarTrackMargin;
    const trackY = this.theme.scrollBarTrackMargin + 1;
    const trackWidth  = barWidth  - (this.theme.scrollBarTrackMargin * 2);
    const trackHeight = barHeight - trackY - this.theme.scrollBarTrackMargin;

    this.track.setAttrs({
      x: trackX,
      y: trackY,
      width: trackWidth,
      height: trackHeight
    });

    const thumbWidth = (viewportWidth / scrollWidth) * trackWidth;

    this.thumb.setAttrs({
      x: trackX,
      y: trackY,
      width: thumbWidth,
      height: trackHeight
    });

    const trackRight = this.track.x() + this.track.width();
    this.maxThumbLeft = trackRight - thumbWidth;

    this.repositionThumb();

    this.borders.removeChildren();

    const topBorder = this.nodeManager.getLine({
      type: "horizontal",
      length: this.width(),
      thickness: 1,
      color: this.theme.tableBorderColor,
      key: "hsb-top-border"
    });
    this.borders.add(topBorder);

    const rightBorder = this.nodeManager.getLine({
      type: "vertical",
      length: this.height(),
      thickness: 1,
      color: this.theme.tableBorderColor,
      key: "hsb-right-border"
    });
    rightBorder.x(this.width());
    this.borders.add(rightBorder);
  }

  onWheel() {
    this.repositionThumb();
  }

  repositionThumb() {
    const { x: normalizedScrollLeft } = this.tableState.normalizedScrollPosition;

    const thumbLeft = Utils.scale(normalizedScrollLeft, 0, 1, this.track.x(), this.maxThumbLeft);
    this.thumb.x(thumbLeft);
  }
}
