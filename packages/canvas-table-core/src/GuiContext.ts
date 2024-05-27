export class GuiContext {
  public hot: string | null = null;
  public active: string | null = null;

  public setActive(id: string | null) {
    this.active = id;
  }

  public setHot(id: string | null) {
    if (this.isNoneActive()) {
      this.hot = id;
    }
  }

  public isActive(id: string | null) {
    return this.active === id;
  }

  public isHot(id: string | null) {
    return this.hot === id;
  }

  public isAnyActive() {
    return this.active !== null;
  }

  public isAnyHot() {
    return this.hot !== null;
  }

  public isNoneActive() {
    return this.active === null;
  }

  public isNoneHot() {
    return this.hot === null;
  }
}
