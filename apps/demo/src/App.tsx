import { CanvasTable } from "@bzrr/canvas-table";
import { generateData } from "./utils";
import "./App.css";

const [columns, data] = generateData(100, 100);

function App() {
    return (
        <div className="App">
            <CanvasTable
                columns={columns}
                data={data}
                onSelectRow={row => console.log(row)}
                className="CanvasTable"
            />
        </div>
    );
}

export default App;
