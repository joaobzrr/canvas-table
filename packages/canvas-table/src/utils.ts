export function make_matrix(rows: number, columns: number) {
    const matrix: (number | undefined)[][] = new Array(rows);
    for (let i = 0; i < rows; i++) {
        matrix[i] = new Array(columns);
    }
    return matrix;
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export function scale(
    value:   number,
    fromMin: number,
    fromMax: number,
    toMin:   number,
    toMax:   number
) {
    if (value <= fromMin) {
        return toMin;
    } else if (value >= fromMax) {
        return toMax;
    } else {
        return Math.round((value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin);
    }
}

export function sum_array(numbers: number[]) {
    let sum = 0;
    for (const number of numbers) {
        sum += number;
    }
    return sum;
}

export function accumulate(numbers: number[]) {
    const result = new Array(numbers.length).fill(0);
    let sum = 0;

    for (const [index, number] of numbers.entries()) {
        result[index] = sum;
        sum += number;
    }

    return result;
}
