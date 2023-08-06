import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { NodeAllocator, TableState, Rect } from "../core";
import { Utils } from "../Utils";
import { Theme } from "../types";
import { Line } from "./Line";

export interface HorizontalScrollbarConfig extends GroupConfig {
  tableState: TableState;
  nodeAllocator: NodeAllocator;
  theme: Theme
}

export class HorizontalScrollbar extends Konva.Group {
  private tableState: TableState;
  private nodeAllocator: NodeAllocator;
  private theme: Theme;

  private bar:   Konva.Rect;
  private thumb: Konva.Rect;
  private track: Rect;

  private borderGroup: Konva.Group;

  private maxThumbLeft = 0;

  constructor(config: HorizontalScrollbarConfig) {
    super(config);

    this.tableState = config.tableState;
    this.theme = config.theme;

    this.nodeAllocator = new NodeAllocator(this.theme);

    this.bar = new Konva.Rect({ fill: this.theme.scrollBarTrackColor });
    this.add(this.bar);

    this.track = Rect.create();

    this.thumb = new Konva.Rect({ fill: this.theme.scrollBarThumbColor });
    this.add(this.thumb);

    this.borderGroup = new Konva.Group();
    this.add(this.borderGroup);

    this.on("widthChange heightChange", this.onResize.bind(this));
  }

  public onResize() {
    this.updateBar();
    this.updateTrack();
    this.updateThumb();
    this.repositionThumb();
    this.updateBorders();
  }

  public updateThumb() {
    const { width: viewportWidth } = this.tableState.viewportDimensions;
    const { width: scrollWidth } = this.tableState.scrollDimensions;

    const thumbWidth = (viewportWidth / scrollWidth) * this.track.width;

    this.thumb.setAttrs({
      y: this.track.y,
      width: thumbWidth,
      height: this.track.height
    });

    this.maxThumbLeft = this.track.right - this.thumb.width();
  }

  public repositionThumb() {
    const { x: normalizedScrollLeft } = this.tableState.normalizedScrollPosition;

    const thumbLeft = Utils.scale(normalizedScrollLeft, 0, 1, this.track.x, this.maxThumbLeft);
    this.thumb.x(thumbLeft);
  }

  private updateBar() {
    const barHeight = this.theme.scrollBarThickness;
    const barWidth = this.width();

    this.bar.setAttrs({
      x: 0,
      y: 0,
      width: barWidth,
      height: barHeight
    });
  }

  private updateTrack() {
    const trackX = this.theme.scrollBarTrackMargin;
    const trackY = this.theme.scrollBarTrackMargin + 1;
    const trackWidth  = this.bar.width()  - (this.theme.scrollBarTrackMargin * 2);
    const trackHeight = this.bar.height() - trackY - this.theme.scrollBarTrackMargin;

    this.track.set({
      x: trackX,
      y: trackY,
      width: trackWidth,
      height: trackHeight
    });
  }

  private updateBorders() {
    const lines = this.borderGroup.children as Line[];
    this.borderGroup.removeChildren();
    this.nodeAllocator.free("line", ...lines);

    const topBorder = this.nodeAllocator.allocate("line");
    topBorder.setAttrs({
      width: this.width(),
      height: 1,
      fill: this.theme.tableBorderColor,
    });
    this.borderGroup.add(topBorder);

    const rightBorder = this.nodeAllocator.allocate("line");
    rightBorder.setAttrs({
      x: this.width(),
      width: 1,
      height: this.height(),
      fill: this.theme.tableBorderColor,
    });
    this.borderGroup.add(rightBorder);
  }
}
