import { shallowMatch, isObject } from "../../utils";
import { UiId } from "./types";

export class UiContext {
  hot: UiId | null;
  active: UiId | null;

  constructor() {
    this.hot = null;
    this.active = null;
  }

  setAsActive(id: null): void;
  setAsActive(name: string, index?: number): void;
  setAsActive(id: Partial<UiId>): void;
  setAsActive(...args: any[]) {
    if (args[0] === null) {
      this.active = null;
    } else {
      const id = UiContext.idFromArgs(...args);
      this.active = id;
    }
  }

  setAsHot(name: string, index?: number): void;
  setAsHot(id: Partial<UiId>): void;
  setAsHot(...args: any[]) {
    if (!this.active) {
      const id = UiContext.idFromArgs(...args);
      this.hot = id;
    }
  }

  unsetAsHot(name: string, index?: number): void;
  unsetAsHot(id: Partial<UiId>): void;
  unsetAsHot(...args: any[]) {
    const id = UiContext.idFromArgs(...args);
    if (this.isHot(id)) {
      this.hot = null;
    }
  }

  isActive(name: string, index?: number): boolean;
  isActive(id: Partial<UiId>): boolean;
  isActive(...args: any[]) {
    if (this.active === null) {
      return false;
    }

    const id = UiContext.idFromArgs(...args);
    return shallowMatch(id, this.active);
  }

  isHot(name: string, index?: number): boolean;
  isHot(id: Partial<UiId>): boolean;
  isHot(...args: any[]) {
    if (this.hot === null) {
      return false;
    }

    const id = UiContext.idFromArgs(...args);
    return shallowMatch(id, this.hot);
  }

  getActiveIndex() {
    return this.active?.index;
  }

  getHotIndex() {
    return this.hot?.index;
  }

  static idFromArgs(...args: any[]) {
    let id: UiId;
    if (isObject(args[0])) {
      id = args[0];
    } else {
      id = { name: args[0], index: args[1] };
    }
    return id;
  }
}
