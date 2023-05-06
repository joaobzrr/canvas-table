import { useState } from "react";
import { CanvasTable } from "@bzrr/canvas-table";
import { generateData } from "./utils";
import "./App.css";

const [columns, data] = generateData(100, 100);

function App() {
    const [selectedRow, setSelectedRow] = useState<number>();

    return (
        <div className="App">
            <CanvasTable
                columns={columns}
                data={data}
                selectedRow={selectedRow}
                onRowClick={(_, index) => setSelectedRow(index)}
                className="CanvasTable"
            />
        </div>
    );
}

export default App;
