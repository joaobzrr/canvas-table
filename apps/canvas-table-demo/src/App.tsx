import { useState } from "react";
import { debounce } from "lodash";
import { CanvasTable } from "canvas-table-react";
import { DataRow, Theme } from "canvas-table-core";
import ThemeForm from "./ThemeForm";
import TableList from "./TableList";
import Tabs from "./Tabs";
import { tables } from "./tables";
import { useElementSize } from "./useElementSize";
import styles from "./App.module.css";
import { Table } from "./types";

function App() {
  const [table, setTable] = useState<Table>(tables[0]);

  const [theme, setTheme] = useState<Partial<Theme>>();

  const [containerSize, containerRef] = useElementSize();

  const [selectedTab, setSelectedTab] = useState<React.Key>("tables");

  const [selectedRow, setSelectedRow] = useState<DataRow>();

  const updateTheme = debounce((theme: Partial<Theme>) => {
    setTheme(prevTheme => ({ ...prevTheme, ...theme }));
  }, 250);

  const onTableChange = (id: string) => {
    const table = tables.find(table => table.id === id);
    if (!table) {
      throw new Error(`Table with id "${id}" could not be found`);
    }
    setTable(table);
  }

  return (
    <div className={styles.app}>
      <div className={styles["left-sidebar"]}>
        <Tabs
          items={[
            {
              key: "tables",
              label: "Tables"
            },
            {
              key: "theme",
              label: "Theme"
            }
          ]}
          selected={selectedTab}
          onTabClick={(key => setSelectedTab(key))}
        />
        {selectedTab === "tables"
          ?
            <TableList
              value={table.id}
              tables={tables}
              onChange={onTableChange}
            />
          :
            <ThemeForm
              style={{ flex: 1 }}
              onChange={updateTheme}
            />
        }
      </div>
      <main className={styles.main}>
        <CanvasTable
          columnDefs={table.columnDefs}
          dataRows={table.dataRows}
          size={containerSize}
          theme={theme}
          onSelect={(_, row) => setSelectedRow(row)}
          containerClassName={styles["canvas-table"]}
          ref={containerRef}
          {...containerSize}
        />
      </main>
      <div className={styles["right-sidebar"]}>
        {selectedRow && (
          <form>
            {table.columnDefs.map(({ title, field }, index) => (
              <div className={styles.row} key={index}>
                <label className={styles.label}>{title}</label>
                <input
                  value={selectedRow[field]}
                  className={styles.input}
                  disabled={true}
                />
              </div>
            ))}
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
