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