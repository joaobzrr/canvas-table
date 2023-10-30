import { useState } from "react";
import { debounce } from "lodash";
import { CanvasTable } from "@bzrr/canvas-table-react";
import { defaultTheme, DataRow, Theme } from "@bzrr/canvas-table-core";
import ThemeForm from "./ThemeForm";
import TableList from "./TableList";
import Tabs from "./Tabs";
import { tables } from "./tables";
import { useElementSize } from "./useElementSize";
import { shallowMerge } from "./utils";
import styles from "./App.module.css";
import { Table } from "./types";

function App() {
  const [table, setTable] = useState<Table>(tables[0]);

  const [themeSettings, setThemeSettings] = useState<Partial<Theme>>({});
  const theme = shallowMerge({}, defaultTheme, themeSettings);

  const [containerSize, containerRef] = useElementSize();

  const [selectedTab, setSelectedTab] = useState<React.Key>("tables");

  const [selectedRow, setSelectedRow] = useState<DataRow>();

  const updateTheme = debounce((partial: Partial<Theme>) => {
    setThemeSettings((prevThemeSettings) => ({
      ...prevThemeSettings,
      ...partial
    }));
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
      <div className={styles.leftSidebar}>
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
          selectId={(dataRow) => dataRow.id}
          onSelect={(_, row) => setSelectedRow(row)}
          containerClassName={styles.canvasTable}
          ref={containerRef}
          {...containerSize}
        />
      </main>
      <div className={styles.rightSidebar}>
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
