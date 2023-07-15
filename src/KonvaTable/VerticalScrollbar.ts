import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { TableState } from "./TableState";
import { MathUtils } from "./MathUtils";

export interface VerticalScrollbarConfig extends ComponentConfig {
  tableState: TableState;
}

export class VerticalScrollbar extends Component {
  tableState: TableState;

  bar:   Konva.Rect;
  track: Konva.Rect;
  thumb: Konva.Rect;

  maxThumbTop = 0;

  constructor(config: VerticalScrollbarConfig) {
    super(config);

    this.tableState = config.tableState;

    this.bar = new Konva.Rect({
      fill: "green",
      strokeWidth: 1
    });
    this.add(this.bar);

    this.track = new Konva.Rect();
    this.add(this.track);

    this.thumb = new Konva.Rect({ fill: "red" });
    this.add(this.thumb);

    this.on("widthChange heightChange", this.onResize.bind(this));
  }

  onResize() {
    const { y: viewportHeight } = this.tableState.viewportDimensions;
    const { y: scrollHeight } = this.tableState.scrollDimensions;

    const { theme } = this.tableState;
    const barWidth = theme.scrollBarThickness;

    const barHeight = this.height();

    this.bar.setAttrs({
      x: 0,
      y: 0,
      width: barWidth,
      height: barHeight
    });

    const trackX = theme.scrollBarTrackMargin;
    const trackY = theme.scrollBarTrackMargin;
    const trackWidth  = barWidth  - (theme.scrollBarTrackMargin * 2);
    const trackHeight = barHeight - (theme.scrollBarTrackMargin * 2);

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

    this.repositionThumb();
  }

  onWheel() {
    this.repositionThumb();
  }

  repositionThumb() {
    const { y: normalizedScrollTop } = this.tableState.normalizedScrollPosition;
    this.thumb.y(MathUtils.scale(normalizedScrollTop, 0, 1, this.track.y(), this.maxThumbTop));
  }
}
