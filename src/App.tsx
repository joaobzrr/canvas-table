import { useEffect, useLayoutEffect, useRef } from "react";
import { KonvaTable } from "./KonvaTable";
import { generateTableData } from "./testing/utils/generateTableData";
import styles from "./App.module.css";
import { useElementSize } from "./testing/hooks/useElementSize";

const [columnDefs, dataRows] = generateTableData(10, 10);

function App() {
  const [containerSize, containerRef] = useElementSize();

  const konvaTableRef = useRef<KonvaTable>();

  useLayoutEffect(() => {
    konvaTableRef.current = new KonvaTable({
      container: "container",
      columnDefs,
      dataRows
    });
  }, []);

  useEffect(() => {
    if (konvaTableRef.current) {
      const { width: containerWidth, height: containerHeight } = containerSize;
      konvaTableRef.current.setCanvasDimensions(containerWidth, containerHeight);
    }
  }, [containerSize]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      id="container"
    >
      Hello, World!
    </div>
  );
}

export default App
