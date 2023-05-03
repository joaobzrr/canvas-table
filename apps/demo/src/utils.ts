import { Column_Def } from "@bzrr/canvas-table";

export function generateData(rows: number, cols: number): [
    Column_Def[],
    Record<string, string>[]
] {
    const columns = [];
    for (let i = 0; i < cols; i++) {
	columns.push({
	    name: `Column ${i + 1} xxxxxxxxxxxxxxxxxxxx`,
	    key: `column${i + 1}`,
	    width: randint(100, 200)
	});
    }

    const data = [];
    for (let i = 0; i < rows; i++) {
	data.push(Object.fromEntries(columns.map((column, index) => {
	    return [column.key, `${i + 1}/${index + 1} xxxxxxxxxxxxxxxxxxxx`];
	})));
    }

    return [columns, data];
}

export function randint(min: number, max: number) {
    const _min = Math.ceil(min);
    const _max = Math.floor(max);
    return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}
