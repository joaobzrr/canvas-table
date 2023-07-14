import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { TableState } from "./TableState";

export interface VerticalScrollbarConfig extends ComponentConfig {
  tableState: TableState;
}

export class VerticalScrollbar extends Component {
  tableState: TableState;

  bar:   Konva.Rect;
  track: Konva.Rect;
  thumb: Konva.Rect;

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
  }

  onResize() {
    this.render();
  }

  onWheel() {
    this.render();
  }

  render() {
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

    this.thumb.setAttrs({
      x: trackX,
      y: trackY,
      width: trackWidth,
      height: (viewportHeight / scrollHeight) * trackHeight,
    });
  }
}
