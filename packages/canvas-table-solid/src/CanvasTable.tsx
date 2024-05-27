import { createEffect, onMount, onCleanup, splitProps, Show, type JSX } from 'solid-js';
import { CanvasTable, type CanvasTableParams } from '@bzrr/canvas-table-core';

let instanceCount = 0;

const makeContainerId = () => {
  const result = `canvas-table-container-${instanceCount}`;
  instanceCount++;
  return result;
};

export type CanvasTableContainerProps = {
  id: string;
};

export type RenderContainerFunction = (containerProps: CanvasTableContainerProps) => JSX.Element;

export type CanvasTableComponentProps = Omit<CanvasTableParams, 'container'> & {
  renderContainer?: RenderContainerFunction;
};

export const CanvasTableComponent = (props: CanvasTableComponentProps) => {
  const [local, others] = splitProps(props, ['renderContainer']);

  const containerId = makeContainerId();

  let instance: CanvasTable | null = null;
  onMount(() => {
    if (!instance) {
      instance = new CanvasTable({ container: containerId, ...others });
    }
  });

  createEffect(() => {
    if (instance) {
      instance.config({ ...others });
    }
  });

  onCleanup(() => {
    if (instance) {
      instance.destroy();
    }
  });

  return (
    <Show
      when={local.renderContainer}
      fallback={<DefaultContainer id={containerId} />}
    >
      {local.renderContainer!({ id: containerId })}
    </Show>
  );
};

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
