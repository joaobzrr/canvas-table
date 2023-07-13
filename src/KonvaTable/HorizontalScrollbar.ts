import Konva from "konva";
import { TableState } from "./TableState";

export class HorizontalScrollbar extends Konva.Group {
  tableState: TableState;

  bar: Konva.Rect;
  track: Konva.Rect;
  thumb: Konva.Rect;

  constructor(tableState: TableState) {
    super();

    this.tableState = tableState;

    this.bar = new Konva.Rect({
      stroke: "black",
      fill: "white",
      strokeWidth: 1
    });
    this.add(this.bar);

    this.track = new Konva.Rect();
    this.add(this.track);

    this.thumb = new Konva.Rect({ fill: "red" });
    this.add(this.thumb);
  }

  onResize(size: { width: number, height: number }) {
    const { theme } = this.tableState;

    this.bar.x(0);
    this.bar.y(size.height - theme.scrollBarThickness);
    this.bar.width(size.width);
    this.bar.height(theme.scrollBarThickness);

    this.track.x(this.bar.x() + theme.scrollBarTrackMargin);
    this.track.y(this.bar.y() + theme.scrollBarTrackMargin);
    this.track.width(this.bar.width() - (theme.scrollBarTrackMargin * 2));
    this.track.height(this.bar.height() - (theme.scrollBarTrackMargin * 2));

    const { x: viewportWidth } = this.tableState.viewportDimensions;
    const { x: scrollWidth } = this.tableState.scrollDimensions;

    this.thumb.x(this.track.x());
    this.thumb.y(this.track.y());
    this.thumb.width((viewportWidth / scrollWidth) * this.track.width());
    this.thumb.height(this.track.height());
  }
}
