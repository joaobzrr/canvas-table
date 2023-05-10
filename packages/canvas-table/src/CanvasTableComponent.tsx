import { useRef, useEffect, useLayoutEffect } from "react";
import CanvasTable from "./CanvasTable";
import { Column_Def } from "./types";

type PropsType<T extends Record<string, string>> = {
    columns: Column_Def<T>[];
    data: T[];

    onSelectRow?: (row: T) => void;

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
