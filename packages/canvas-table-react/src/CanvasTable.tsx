import { useRef, useLayoutEffect } from "react";
import { CanvasTable } from "@bzrr/canvas-table-core";
import { useElementSize, usePrevious } from "./hooks";
import { shallowMatch } from "./utils";
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

  const tableProps = { size: elementSize, ...rest }
  const prevTableProps = usePrevious(tableProps);

  useLayoutEffect(() => {
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      ...tableProps,
    });

    return () => {
      canvasTableRef.current!.cleanup();
      canvasTableRef.current = null;
    };
  }, []);

  if (prevTableProps && !shallowMatch(tableProps, prevTableProps)) {
    canvasTableRef.current!.config(tableProps);
  }

  return (
    <div
      id={containerIdRef.current}
      className={containerClassName}
      style={containerStyle}
      ref={elementRef}
    />
  );
}
