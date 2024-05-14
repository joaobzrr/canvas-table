export class GuiContext {
  public hotWidget: string | null = null;
  public activeWidget: string | null = null;

  public hoveredRowIndex = -1;

  public dragAnchorX = 0;
  public dragAnchorY = 0;

  public headerAreaClipRegion: Path2D = undefined!;
  public bodyAreaClipRegion: Path2D = undefined!;

  setActiveWidget(id: string | null) {
    this.activeWidget = id;
  }

  setHotWidget(id: string | null) {
    if (this.isNoWidgetActive()) {
      this.hotWidget = id;
    }
  }

  isWidgetActive(id: string | null) {
    return this.activeWidget === id;
  }

  isWidgetHot(id: string | null) {
    return this.hotWidget === id;
  }

  isAnyWidgetActive() {
    return this.activeWidget !== null;
  }

  isAnyWidgetHot() {
    return this.hotWidget !== null;
  }

  isNoWidgetActive() {
    return this.activeWidget === null;
  }

  isNoWidgetHot() {
    return this.hotWidget === null;
  }
}
