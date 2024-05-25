import React, { useRef, useLayoutEffect } from 'react';
import { CanvasTable, type CanvasTableParams } from '@bzrr/canvas-table-core';

let instanceCount = 0;

function makeContainerId() {
  const result = `canvas-table-container-${instanceCount}`;
  instanceCount++;
  return result;
}

export type CanvasTableContainerProps = {
  id: string;
};

export type RenderContainerFunction = (containerProps: CanvasTableContainerProps) => JSX.Element;

export type CanvasTableComponentProps = Omit<CanvasTableParams, 'container'> & {
  renderContainer?: RenderContainerFunction;
};

export const CanvasTableComponent = React.memo((props: CanvasTableComponentProps) => {
  const { renderContainer, ...tableProps } = props;

  const canvasTableRef = useRef<CanvasTable | null>(null);
  const containerIdRef = useRef(makeContainerId());

  useLayoutEffect(() => {
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      ...tableProps,
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

  if (!renderContainer) {
    return <DefaultContainer id={containerIdRef.current} />;
  }

  return renderContainer({ id: containerIdRef.current });
});

const DefaultContainer = (props: CanvasTableContainerProps) => {
  return (
    <div
      {...props}
      style={{
        width: '300px',
        height: '150px',
      }}
    />
  );
};
