import { useRef, useEffect, useLayoutEffect } from "react";
import CanvasTable from "./CanvasTable";
import { Column_Def } from "./types";

type PropsType = {
    columns: Column_Def[];
    data: Record<string, any>[];
    className?: string;
}

export default function CanvasTableComponent(props: PropsType) {
    const { columns, data, className } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tableRef = useRef<CanvasTable>();

    useLayoutEffect(() => {
	tableRef.current = new CanvasTable(canvasRef.current!, columns, data);
	return () => tableRef.current!.destroy();
    }, []);

    useEffect(() => {
	tableRef.current!.reinit(data, columns);
    }, [columns, data]);

    return <canvas ref={canvasRef} className={className} />;
}
