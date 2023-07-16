import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { TableState } from "./TableState";
import { Line } from "./Line";
import { Utils } from "./Utils";
import { Theme } from "./types";

export interface VerticalScrollbarConfig extends GroupConfig {
  tableState: TableState;
  theme:      Theme;
}

export class VerticalScrollbar extends Konva.Group {
  tableState: TableState;
  theme:      Theme;

  bar:   Konva.Rect;
  track: Konva.Rect;
  thumb: Konva.Rect;

  lines: Konva.Group;

  maxThumbTop = 0;

  constructor(config: VerticalScrollbarConfig) {
    super(config);

    this.tableState = config.tableState;
    this.theme = config.theme;

    this.bar = new Konva.Rect({ fill: "white", strokeWidth: 1 });
    this.add(this.bar);

    this.track = new Konva.Rect();
    this.add(this.track);

    this.thumb = new Konva.Rect({ fill: "black" });
    this.add(this.thumb);

    this.lines = new Konva.Group();
    this.add(this.lines);

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

    this.lines.removeChildren();
    this.lines.add(new Line({
      x: 0,
      y: 0,
      type: "vline",
      length: this.height(),
      thickness: 1,
      color: "#000000"
    }));

    this.lines.add(new Line({
      x: 0,
      y: barY,
      type: "hline",
      length: this.width(),
      thickness: 1,
      color: "#000000"
    }));

    this.lines.add(new Line({
      x: 0,
      y: this.height(),
      type: "hline",
      length: this.width(),
      thickness: 1,
      color: "#000000"
    }));

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
