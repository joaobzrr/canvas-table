import { useState, useRef, useLayoutEffect, MutableRefObject } from "react";
import useResizeObserver from "@react-hook/resize-observer";

export function useElementSize<T extends HTMLElement = HTMLDivElement>(): [
  { width: number; height: number },
  MutableRefObject<T | null>,
] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const target = useRef<T | null>(null);

  useLayoutEffect(() => {
    if (!target.current) return;
    const { clientWidth: width, clientHeight: height } = target.current;
    setSize({ width, height });
  }, [target]);

  useResizeObserver(target, (entry) => {
    const { inlineSize: width, blockSize: height } = entry.contentBoxSize[0];
    setSize({ width, height });
  });

  return [size, target];
}
