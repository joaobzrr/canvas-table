export class GuiContext {
  public hotWidget: string | null = null;
  public activeWidget: string | null = null;

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
