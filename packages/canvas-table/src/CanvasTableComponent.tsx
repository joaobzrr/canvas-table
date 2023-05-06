import { useRef, useEffect, useLayoutEffect } from "react";
import CanvasTable from "./CanvasTable";
import { Column_Def } from "./types";

type PropsType = {
    columns: Column_Def[];
    data: Record<string, any>[];

    selectedRow?: number;
    onRowClick?: (row: Record<string, any>, index: number) => void;

    className?: string;
}

export default function CanvasTableComponent(props: PropsType) {
    const { columns, data, selectedRow, onRowClick, className } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tableRef = useRef<CanvasTable>();

    useLayoutEffect(() => {
	tableRef.current = new CanvasTable(canvasRef.current!, columns, data, onRowClick);
	return () => tableRef.current!.destroy();
    }, []);

    useEffect(() => {
	tableRef.current!.reinit(data, columns);
    }, [columns, data]);

    useEffect(() => {
	tableRef.current?.set_selected_row(selectedRow);
    }, [selectedRow]);

    return <canvas ref={canvasRef} className={className} />;
}
