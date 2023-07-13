import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";

export type ComponentConfig = GroupConfig;

export class Component extends Konva.Group {
  constructor(config: ComponentConfig) {
    super(config);
  }
}
