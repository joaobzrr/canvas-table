import { useRef, useEffect, useLayoutEffect } from "react";
import CanvasTable from "./CanvasTable";
import { Column_Def, Data_Row } from "./types";

type PropsType<T extends Record<string, string>> = {
    columns: Column_Def[];
    data: Data_Row<T>[];

    onSelectRow?: (row: Data_Row<T>) => void;

    className?: string;
}

export default function CanvasTableComponent<T extends Record<string, string>>(props: PropsType<T>) {
    const { columns, data, onSelectRow, className } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tableRef = useRef<CanvasTable<T>>();

    useLayoutEffect(() => {
	tableRef.current = new CanvasTable(canvasRef.current!, columns, data, onSelectRow);
	return () => tableRef.current!.destroy();
    }, []);

    useEffect(() => {
	tableRef.current!.reinit(data, columns);
    }, [columns, data]);

    return <canvas ref={canvasRef} className={className} />;
}
