import { useState } from "react";
import { debounce } from "lodash";
import CanvasTable, { Theme } from "canvas-table-react";
import { columnDefs, dataRows } from "./pokemon";
import { useElementSize } from "./testing/hooks/useElementSize";
import styles from "./App.module.css";

function App() {
  const [containerSize, containerRef] = useElementSize();
  const [theme, setTheme] = useState<Partial<Theme>>();

  const updateTheme = debounce((theme: Partial<Theme>) => {
    setTheme(prevTheme => ({ ...prevTheme, ...theme }));
  }, 250);
  
  return (
    <div className={styles.app}>
      <div className={styles.sidebar}>
        <form>
          <div className={styles.row}>
            <label className={styles.label}>Font Family</label>
            <input
              onChange={event => updateTheme({
                fontFamily: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Font Size</label>
            <input
              onChange={event => updateTheme({
                fontSize: parseInt(event.target.value) || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Font Color</label>
            <input
              onChange={event => updateTheme({
                fontColor: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Border Color</label>
            <input
              onChange={event => updateTheme({
                tableBorderColor: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Scrollbar Thickness</label>
            <input
              onChange={event => updateTheme({
                scrollBarThickness: parseInt(event.target.value) || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Scrollbar Track Margin</label>
            <input
              onChange={event => updateTheme({
                scrollBarTrackMargin: parseInt(event.target.value) || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Scrollbar Thumb Color</label>
            <input
              onChange={event => updateTheme({
                scrollBarThumbColor: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Scrollbar Track Color</label>
            <input
              onChange={event => updateTheme({
                scrollBarTrackColor: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
        </form>
      </div>
      <main className={styles.main}>
        <CanvasTable
          columnDefs={columnDefs}
          dataRows={dataRows}
          size={containerSize}
          theme={theme}
          containerClassName={styles["canvas-table"]}
          ref={containerRef}
          {...containerSize}
        />
      </main>
    </div>
  );
}

export default App;
