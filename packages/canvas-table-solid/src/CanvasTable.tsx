import { createEffect, splitProps, type JSX } from "solid-js";
import { CanvasTable, CanvasTableParams } from "@bzrr/canvas-table-core";

let instanceCount = 0;

const makeContainerId = () => {
  const result = `canvas-table-container-${instanceCount}`;
  instanceCount++;
  return result;
};

export type CanvasTableComponentProps = Omit<CanvasTableParams, "container"> & {
  containerClass?: string;
  containerStyle?: JSX.CSSProperties;
};

export const CanvasTableComponent = (props: CanvasTableComponentProps) => {
  const [custom, tableProps] = splitProps(props, ["containerClass", "containerStyle"]);

  const containerId = makeContainerId();

  let instance: CanvasTable | null = null;
  createEffect(() => {
    if (instance) {
      instance.config({ ...tableProps });
    } else {
      instance = new CanvasTable({ container: containerId, ...tableProps });
    }
  });

  return (
    <div
      id={containerId}
      class={custom.containerClass}
      style={custom.containerStyle}
    />
  );
};
