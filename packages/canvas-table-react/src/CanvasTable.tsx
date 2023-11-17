import { useRef, useLayoutEffect } from "react";
import { CanvasTable } from "@bzrr/canvas-table-core";
import { useElementSize, useUpdateEffect } from "./hooks";
import { CanvasTableProps } from "./types";

let count = 0;

function getContainerId() {
  const result = `canvas-table-container-${count}`;
  count++;
  return result;
}

export function CanvasTableComponent(props: CanvasTableProps) {
  const {
    containerClassName,
    containerStyle,
    ...rest
  } = props;

  const canvasTableRef = useRef<CanvasTable | null>(null);
  const containerIdRef = useRef(getContainerId());

  const [elementSize, elementRef] = useElementSize();

  useLayoutEffect(() => {
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      size: elementSize,
      ...rest,
    });

    return () => {
      canvasTableRef.current!.cleanup();
      canvasTableRef.current = null;
    };
  }, []);

  useUpdateEffect(() => {
    canvasTableRef.current!.config({
      size: elementSize,
      ...rest
    });
  }, [elementSize, rest]);

  return (
    <div
      id={containerIdRef.current}
      className={containerClassName}
      style={containerStyle}
      ref={elementRef}
    />
  );
}
