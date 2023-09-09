import Konva from "konva";
import { CanvasTable } from "./CanvasTable";
import { HorizontalScrollbar } from "./HorizontalScrollbar";
import { VerticalScrollbar } from "./VerticalScrollbar";

export class ScrollbarLayer {
  private layer: Konva.Layer;
  
  private hsb: HorizontalScrollbar;
  private vsb: VerticalScrollbar;

  constructor(ct: CanvasTable) {
    this.layer = new Konva.Layer();

    this.hsb = new HorizontalScrollbar(ct);
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar(ct);
    this.layer.add(this.vsb);
  }

  public getLayer() {
    return this.layer;
  }
}
