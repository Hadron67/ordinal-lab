/** @import { Y0MontagneRow } from './types/ordinal'; */

import { Y0MontagneRow } from './types/ordinal.js';
import { transpose } from './utils.js';

function findY0Parent(row: Y0MontagneRow, elemPtr: number) {
    const start = row.data[elemPtr];
    if (row.parentPtr.length === 0) {
        for (elemPtr--; elemPtr >= 0; elemPtr--) {
            if (row.data[elemPtr] < start) {
                return elemPtr;
            }
        }
        return null;
    }
    let ptr: number | null = elemPtr;
    while (ptr !== null) {
        const parentElem = row.data[ptr];
        if (parentElem < start) {
            return ptr;
        }
        ptr = row.parentPtr[ptr];
    }
    return null;
}

export function y0Montagne(data: number[]): Y0MontagneRow[] {
    const ret: Y0MontagneRow[] = [{data, parentPtr: []}];
    let lastRow = ret[0];
    while (true) {
        const newRow: Y0MontagneRow = {data: [], parentPtr: []};
        for (let i = 0; i < data.length; i++) {
            const elem = lastRow.data[i];
            const parentPtr = findY0Parent(lastRow, i);
            newRow.data.push(parentPtr !== null ? elem - lastRow.data[parentPtr] : elem);
            newRow.parentPtr.push(parentPtr);
        }
        if (!newRow.parentPtr.some(e => e !== null)) {
            break;
        }
        ret.push(newRow);
        lastRow = newRow;
    }
    return ret;
}

function isSameElem<T>(arr: T[]) {
    if (arr.length > 0) {
        const first = arr[0];
        for (let i = 0; i < arr.length; i++) {
            if (first !== arr[i]) {
                return false;
            }
        }
    }
    return true;
}

export function stringifyBMS(bms: number[][]) {
    const transposed = transpose(bms);
    let ret = '';
    for (let i = 0; i < transposed.length; i++) {
        const elem = transposed[i];
        if (i === 0 && isSameElem(elem)) {
            ret += `(${elem[0]})`;
        } else {
            ret += '(' + elem.join(',') + ')';
        }
    }
    return ret;
}

function copyY0MontagneRow(montagne: Y0MontagneRow): Y0MontagneRow {
    return {data: Array.from(montagne.data), parentPtr: Array.from(montagne.parentPtr)};
}

function lastElemHasParent(row: Y0MontagneRow) {
    return row.parentPtr.length > 0 && row.parentPtr[row.parentPtr.length - 1] !== null && row.data[row.data.length - 1] === 1;
}

export function y0ToBMS(montagne: Y0MontagneRow[]) {
    const ret: number[][] = [];
    for (let i = 0; i + 1 < montagne.length; i++) {
        const monLine = montagne[i + 1];
        const bmsRow: number[] = [];
        for (let j = 0, a = monLine.parentPtr; j < a.length; j++) {
            const ptr = a[j];
            bmsRow.push(ptr === null ? 0 : bmsRow[ptr] + 1);
        }
        ret.push(bmsRow);
    }
    return ret;
}

export function findLiftings(seq: number[]) {
    const montagne = y0Montagne(seq);

}

export function expandY0(montagne: Y0MontagneRow[]) {
    while (montagne.length > 0 && !lastElemHasParent(montagne[montagne.length - 1])) {
        montagne.pop();
    }
    if (montagne.length === 0) {
        return null;
    }
    const length = montagne[0].data.length;
    const topRow = montagne[montagne.length - 1];
    const goodRoot = topRow.parentPtr[topRow.parentPtr.length - 1];
    if (goodRoot === null) {
        return null;
    }
    const badRoot = goodRoot + 1;
    const badRootLength = length - badRoot;
    // Initialize result montagne
    const ret: Y0MontagneRow[] = [];
    for (let i = 0; i < montagne.length - 1; i++) {
        const newRow = copyY0MontagneRow(montagne[i]);
        newRow.data[length - 1]--;
        ret.push(newRow);
    }
    const doExpansion = () => {
        // copy top-most row by repeating the bad sequence
        {
            const top = ret[ret.length - 1];
            const data = top.data;
            for (let j = 0; j < badRootLength; j++) {
                data.push(data[badRoot + j]);
            }
        }
        // copy parent links
        for (let i = 0; i < ret.length - 1; i++) {
            const row = ret[ret.length - 1 - i];
            const currentLength = row.parentPtr.length;
            for (let j = 0; j < badRootLength; j++) {
                const parentPtr = row.parentPtr[badRoot + j];
                // FIXME: how to deal with elements with no parent?
                row.parentPtr.push(parentPtr === null ? null : parentPtr >= goodRoot ? currentLength - 1 + parentPtr - goodRoot : parentPtr);
            }
        }
        // fill in data
        for (let i = 0; i < ret.length - 1; i++) {
            const row = ret[ret.length - 2 - i];
            const prevRow = ret[ret.length - 1 - i];
            for (let j = row.data.length; j < prevRow.parentPtr.length; j++) {
                const parentPtr = prevRow.parentPtr[j];
                const parentData = prevRow.data[j];
                if (parentData === null) return null;
                row.data.push(parentPtr === null ? parentData : row.data[parentPtr] + parentData);
            }
        }
    };
    let cursor = length - 1;
    return () => {
        const cursor0 = cursor;
        cursor++;
        if (cursor0 >= ret[0].data.length + 1) {
            doExpansion();
        }
        return ret[0].data.slice(0, cursor0);
    };
}
