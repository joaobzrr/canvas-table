export class GuiContext {
  hot: string | null = null;
  active: string | null = null;

  setActiveWidget(id: string | null) {
    this.active = id;
  }

  setHotWidget(id: string | null) {
    if (this.isNoWidgetActive()) {
      this.hot = id;
    }
  }

  isWidgetActive(id: string | null) {
    return this.active === id;
  }

  isWidgetHot(id: string | null) {
    return this.hot === id;
  }

  isAnyWidgetActive() {
    return this.active !== null;
  }

  isAnyWidgetHot() {
    return this.hot !== null;
  }

  isNoWidgetActive() {
    return this.active === null;
  }

  isNoWidgetHot() {
    return this.hot === null;
  }
}
