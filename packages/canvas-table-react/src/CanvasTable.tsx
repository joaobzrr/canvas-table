import React, { useRef, useLayoutEffect } from "react";
import { CanvasTable, CanvasTableParams } from "@bzrr/canvas-table-core";

export type CanvasTableComponentProps = Omit<CanvasTableParams, "container"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
};

let count = 0;

function getContainerId() {
  const result = `canvas-table-container-${count}`;
  count++;
  return result;
}

export const CanvasTableComponent = React.memo((props: CanvasTableComponentProps) => {
  const { containerClassName, containerStyle, ...tableProps } = props;

  const canvasTableRef = useRef<CanvasTable | null>(null);
  const containerIdRef = useRef(getContainerId());

  useLayoutEffect(() => {
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      ...tableProps
    });

    return () => {
      if (canvasTableRef.current) {
        canvasTableRef.current.destroy();
        canvasTableRef.current = null;
      }
    };
  }, []);

  if (canvasTableRef.current) {
    canvasTableRef.current.config(tableProps);
  }

  return <div id={containerIdRef.current} className={containerClassName} style={containerStyle} />;
});
