import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { TableState } from "./TableState";
import { MathUtils } from "./MathUtils";

export interface HorizontalScrollbarConfig extends ComponentConfig {
  tableState: TableState;
}

export class HorizontalScrollbar extends Component {
  tableState: TableState;

  bar: Konva.Rect;
  track: Konva.Rect;
  thumb: Konva.Rect;

  maxThumbLeft = 0;

  constructor(config: HorizontalScrollbarConfig) {
    super(config);

    this.tableState = config.tableState;

    this.bar = new Konva.Rect({ fill: "green", strokeWidth: 1 });
    this.add(this.bar);

    this.track = new Konva.Rect();
    this.add(this.track);

    this.thumb = new Konva.Rect({ fill: "red" });
    this.add(this.thumb);

    this.on("widthChange heightChange", this.onResize.bind(this));
  }

  onResize() {
    const { x: viewportWidth } = this.tableState.viewportDimensions;
    const { x: scrollWidth } = this.tableState.scrollDimensions;

    const { theme } = this.tableState;
    const barHeight = theme.scrollBarThickness;

    const barWidth = this.width();

    this.bar.setAttrs({
      x: 0,
      y: 0,
      width: barWidth,
      height: barHeight
    });

    const trackX = theme.scrollBarTrackMargin; 
    const trackY = theme.scrollBarTrackMargin;
    const trackWidth = barWidth - (theme.scrollBarTrackMargin * 2);
    const trackHeight = barHeight - (theme.scrollBarTrackMargin * 2);

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
  }

  onWheel() {
    this.repositionThumb();
  }

  repositionThumb() {
    const { x: normalizedScrollLeft } = this.tableState.normalizedScrollPosition;

    const thumbLeft = MathUtils.scale(normalizedScrollLeft, 0, 1, this.track.x(), this.maxThumbLeft);
    this.thumb.x(thumbLeft);
  }
}
