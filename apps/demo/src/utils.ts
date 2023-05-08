import { Column_Def, Data_Row } from "@bzrr/canvas-table";

export function generateData(rows: number, cols: number): [Column_Def[], Data_Row<any>] {
    const columns = [];
    for (let i = 0; i < cols; i++) {
	columns.push({
	    name: `Column ${i + 1}`,
	    field: `column${i + 1}`,
	    width: randint(100, 200)
	});
    }

    const data = [];
    for (let i = 0; i < rows; i++) {
	const extraProperties = Object.fromEntries(columns.map((column, index) => {
	    return [column.field, `${i + 1}/${index + 1}`];
	}));

	data.push({
	    id: i,
	    ...extraProperties
	});
    }

    return [columns, data];
}

export function generateData2(rows: number, cols: number): [Column_Def[], Data_Row<any>] {
    const columns = [];
    for (let i = 0; i < cols; i++) {
	columns.push({
	    name: `Column ${i + 1}`,
	    field: `column${i + 1}`,
	    width: randint(100, 200)
	});
    }

    const data = [];
    for (let i = 0; i < rows; i++) {
	const extraProperties = Object.fromEntries(columns.map(column => {
	    return [column.field, Array.from({ length: 8 }, () => String.fromCharCode(randint(65, 90))).join("")];
	}));

	data.push({
	    id: i,
	    ...extraProperties
	});
    }

    return [columns, data];
}

export function randint(min: number, max: number) {
    const _min = Math.ceil(min);
    const _max = Math.floor(max);
    return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}
