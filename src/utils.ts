export function popMany<T>(arr: T[], len: number) {
    const ret: T[] = [];
    for (let i = 0; i < len; i++) {
        ret.push(arr[arr.length - 1 - i]);
    }
    arr.length -= len;
    return ret;
}

export function pushReversed<T>(dest: T[], src: T[]) {
    for (let i = 0; i < src.length; i++) {
        dest.push(src[src.length - 1 - i]);
    }
}

export function mapAt<T>(arr: T[], i: number, mapper: (elem: T) => T) {
    if (i < 0) i += arr.length;
    const ret: T[] = [];
    for (let j = 0; j < arr.length; j++) {
        const elem = arr[j];
        ret.push(j === i ? mapper(elem) : elem);
    }
    return ret;
}

export function replacePart<T>(array: T[], index: number, value: T) {
    const ret = array.slice();
    if (index < 0) {
        index += array.length;
    }
    ret[index] = value;
    return ret;
}

export function last<T>(arr: T[]) {
    assert(arr.length > 0);
    return arr[arr.length - 1];
}

export function panic(msg?: string): never {
    throw new Error('panic: ' + (msg ?? "<no further info>"));
}

export function assert(cond: unknown): asserts cond {
    if (!cond) panic('assertion failed');
}

export function transpose<T>(arr: T[][]) {
    const ret: T[][] = [];
    for (let i = 0; i < arr[0].length; i++) {
        const row: T[] = [];
        for (let j = 0; j < arr.length; j++) {
            row.push(arr[j][i]);
        }
        ret.push(row);
    }
    return ret;
}

export function lexicographicalCompareNumbers(a: number[], b: number[]) {
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

export class RateLimiter {
    private _lastRun: number | null = null;
    private _timeout: number | null = null;
    constructor(public minInterval: number) {}
    run(cb: () => void) {
        const current = new Date().getTime();
        if (this._lastRun === null || current - this._lastRun >= this.minInterval) {
            this._lastRun = current;
            if (this._timeout) {
                clearTimeout(this._timeout);
                this._timeout = null;
            }
            cb();
        } else if (this._timeout === null) {
            this._timeout = window.setTimeout(() => {
                this._lastRun = new Date().getTime();
                cb();
                this._timeout = null;
            }, current - this._lastRun);
        }
    }
}