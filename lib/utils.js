/**
 * @template T
 * @param {T[]} arr
 * @param {number} len
 * @returns {T[]}
 */
export function popMany(arr, len) {
    /** @type {T[]} */
    const ret = [];
    for (let i = 0; i < len; i++) {
        ret.push(arr[arr.length - 1 - i]);
    }
    arr.length -= len;
    return ret;
}

/**
 * @template T
 * @param {T[]} dest
 * @param {T[]} src
 */
export function pushReversed(dest, src) {
    for (let i = 0; i < src.length; i++) {
        dest.push(src[src.length - 1 - i]);
    }
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
export function lexicographicalCompareNumbers(a, b) {
    for (let i = 0; i < a.length && i < b.length; i++) {
        if (a[i] > b[i]) {
            return 1;
        }
        if (a[i] < b[i]) {
            return -1;
        }
    }
    if (a.length > b.length) return 1;
    if (a.length < b.length) return -1;
    return 0;
}
