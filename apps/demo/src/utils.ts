import { Column_Def } from "@bzrr/canvas-table";

export function generateData(rows: number, cols: number): [Column_Def<any>[], Record<string, string>[]] {
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
	data.push(Object.fromEntries(columns.map(column => {
	    return [column.field, randomString(16)];
	})));
    }

    return [columns, data];
}

export function randomString(length: number) {
    const chars = [];
    for (let i = 0; i < length; i++) {
	chars.push(String.fromCharCode(randint(65, 90)));
    }
    const result = chars.join("");
    return result;
}

export function randint(min: number, max: number) {
    const _min = Math.ceil(min);
    const _max = Math.floor(max);
    return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}
