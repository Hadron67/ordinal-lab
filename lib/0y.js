/** @import { Y0MontagneRow } from './types/yseq'; */

/**
 * @param {Y0MontagneRow} row
 * @param {number} elemPtr
 */
function findY0Parent(row, elemPtr) {
    const start = row.data[elemPtr];
    if (row.parentPtr.length === 0) {
        for (elemPtr--; elemPtr >= 0; elemPtr--) {
            if (row.data[elemPtr] < start) {
                return elemPtr;
            }
        }
        return null;
    }
    /** @type {number | null} */
    let ptr = elemPtr;
    while (ptr !== null) {
        const parentElem = row.data[ptr];
        if (parentElem < start) {
            return ptr;
        }
        ptr = row.parentPtr[ptr];
    }
    return null;
}

/**
 * @param {number[]} data
 * @returns {Y0MontagneRow[]}
 */
export function y0Montagne(data) {
    /** @type {Y0MontagneRow[]} */
    const ret = [{data, parentPtr: []}];
    let lastRow = ret[0];
    while (true) {
        /** @type {Y0MontagneRow} */
        const newRow = {data: [], parentPtr: []};
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

/**
 * @param {Y0MontagneRow} montagne
 * @returns {Y0MontagneRow}
 */
function copyY0MontagneRow(montagne) {
    return {data: Array.from(montagne.data), parentPtr: Array.from(montagne.parentPtr)};
}

/**
 * @param {Y0MontagneRow} row
 */
function lastElemHasParent(row) {
    return row.parentPtr[row.parentPtr.length - 1] !== null && row.data[row.data.length - 1] === 1;
}

/**
 * @param {Y0MontagneRow[]} montagne
 */
export function expandY0(montagne) {
    while (!lastElemHasParent(montagne[montagne.length - 1])) {
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
    /** @type {Y0MontagneRow[]} */
    const ret = [];
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
                // row.parentPtr.push(parentPtr >= goodRoot ? currentLength - 1 + parentPtr - goodRoot : parentPtr);
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