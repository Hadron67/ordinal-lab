/** @import { OrdinalExpression, VeblenFunction, MaximizerOptions, NestedArrayExpression, Ordering, Future, MaximizerExecutor } from './types.js' */

/** @type {OrdinalExpression} */
export const OMEGA = {type: 'omega'};

/**
 * @template T
 * @param {T[]} array
 * @param {number} index
 * @param {(t: T) => T} mapper
 */
function mapAt(array, index, mapper) {
    const ret = array.slice();
    if (index < 0) {
        index += array.length;
    }
    ret[index] = mapper(ret[index]);
    return ret;
}

/**
 * @template T
 * @param {T[]} arr
 */
function last(arr) {
    return arr[arr.length - 1];
}

/**
 * @template T
 * @param {T[]} array
 * @param {number} index
 * @param {T} value
 */
function replacePart(array, index, value) {
    const ret = array.slice();
    if (index < 0) {
        index += array.length;
    }
    ret[index] = value;
    return ret;
}

/**
 * @param {OrdinalExpression} ordinal
 */
function isLimitOrdinal(ordinal) {
    while (true) {
        if (typeof ordinal === 'number') {
            return false;
        } else if (ordinal.type === 'plus') {
            ordinal = last(ordinal.subexpressions);
        } else return true;
    }
}

/**
 * @param {OrdinalExpression} ord
 * @returns {OrdinalExpression | null}
 */
function separateSuccessor(ord) {
    if (typeof ord === 'number') {
        return ord > 0 ? ord - 1 : null;
    } else if (ord.type === 'plus') {
        const ret = separateSuccessor(ord.subexpressions[ord.subexpressions.length - 1]);
        return ret !== null ? makePlus(replacePart(ord.subexpressions, -1, ret)) : null;
    } else return null;
}

/**
 * @param {OrdinalExpression} ord
 * @returns {[OrdinalExpression, number]}
 */
function separateConstCoef(ord) {
    if (typeof ord === 'number') {
        return [1, ord];
    } else switch (ord.type) {
        case 'times': {
            const sub = ord.subexpressions;
            const last = sub[sub.length - 1];
            if (typeof last === 'number') {
                if (sub.length === 2) {
                    return [sub[0], last];
                } else {
                    return [{type: 'times', subexpressions: sub.slice(0, -1)}, last];
                }
            }
        }
        default: return [ord, 1];
    }
}

/**
 * @param {OrdinalExpression} ord
 * @returns {[OrdinalExpression, OrdinalExpression]}
 */
function separatePower(ord) {
    if (typeof ord === 'object' && ord.type === 'power') {
        return [ord.base, ord.power];
    } else {
        return [ord, 1];
    }
}

/**
 * @param {OrdinalExpression[]} args
 * @returns {OrdinalExpression}
 */
export function makePlus(args) {
    /** @type {OrdinalExpression[]} */
    const flattened = [];
    for (const arg of args) {
        if (typeof arg === 'object' && arg.type === 'plus') {
            for (const arg2 of arg.subexpressions) {
                flattened.push(arg2);
            }
        } else {
            flattened.push(arg);
        }
    }
    args = flattened.filter(a => a !== 0);
    if (args.length === 0) {
        return 0;
    } else if (args.length === 1) {
        return args[0];
    } else {
        /** @type {OrdinalExpression[]} */
        const args2 = [];
        let [accumulator, coef] = separateConstCoef(args[0]);
        for (let i = 1; i < args.length; i++) {
            let [factor, coef2] = separateConstCoef(args[i]);
            if (compare(factor, accumulator) === 0) {
                coef += coef2;
            } else {
                if (coef > 1) {
                    args2.push(makeTimes([accumulator, coef]));
                } else {
                    args2.push(accumulator);
                }
                accumulator = factor;
                coef = coef2;
            }
        }
        if (coef > 1) {
            args2.push(makeTimes([accumulator, coef]));
        } else {
            args2.push(accumulator);
        }
        return args2.length > 1 ? {type: 'plus', subexpressions: args2} : args2[0];
    }
}

/**
 * @param {OrdinalExpression[]} args
 * @returns {OrdinalExpression}
 */
export function makeTimes(args) {
    if (args.some(o => o === 0)) {
        return 0;
    }
    args = args.filter(a => a !== 1);
    if (args.length === 0) {
        return 1;
    } else if (args.length === 1) {
        return args[0];
    } else {
        /** @type {OrdinalExpression[]} */
        const args2 = [];
        let [accumulator, pow] = separatePower(args[0]);
        for (let i = 1; i < args.length; i++) {
            let [base2, pow2] = separatePower(args[i]);
            if (compare(accumulator, base2) === 0) {
                pow = makePlus([pow, pow2]);
            } else {
                args2.push(makePower(accumulator, pow));
                accumulator = base2;
                pow = pow2;
            }
        }
        args2.push(makePower(accumulator, pow));
        return args2.length === 1 ? args2[0] : {type: 'times', subexpressions: args2};
    }
}

/**
 * @param {OrdinalExpression} base
 * @param {OrdinalExpression} power
 * @returns {OrdinalExpression}
 */
export function makePower(base, power) {
    if (typeof base === 'object' && base.type === 'omega') {
        if (typeof power === 'object' && power.type === 'veblen' && (power.positional.length > 2 || power.kw.length > 0)) {
            return power;
        }
    }
    if (typeof power === 'number') {
        if (power === 0) {
            return 1;
        } else if (power === 1) {
            return base;
        }
    }
    return {type: 'power', base, power};
}

/**
 * @param {OrdinalExpression} ordinal
 * @param {number} n
 */
export function foundamentalSequence(ordinal, n) {
    /** @type {((ord: OrdinalExpression) => OrdinalExpression)[]} */
    const stack = [];
    let done = false;
    while (!done) {
        if (typeof ordinal === 'object') switch (ordinal.type) {
            case 'omega': {
                ordinal = n;
                done = true;
                break;
            };
            case 'plus': {
                let ord = ordinal;
                ordinal = ordinal.subexpressions[ordinal.subexpressions.length - 1];
                stack.push((ord1) => makePlus(replacePart(ord.subexpressions, -1, ord1)));
                break;
            }
            case 'times': {
                const last = ordinal.subexpressions[ordinal.subexpressions.length - 1];
                const ord = ordinal;
                if (typeof last === 'number') {
                    ordinal = makeTimes(ordinal.subexpressions.slice(0, -1));
                    stack.push(ord1 => makePlus([
                        makeTimes(replacePart(ord.subexpressions, -1, last - 1)),
                        ord1
                    ]));
                } else {
                    ordinal = last;
                    stack.push(ord1 => makeTimes(replacePart(ord.subexpressions, -1, ord1)));
                }
                break;
            }
            case 'power': {
                let ord = ordinal;
                const pow = separateSuccessor(ordinal.power);
                if (pow !== null) {
                    ordinal = ordinal.base;
                    stack.push(ord1 => makeTimes([
                        makePower(ord.base, pow),
                        ord1
                    ]));
                } else {
                    ordinal = ordinal.power;
                    stack.push(ord1 => makePower(ord.base, ord1));
                }
                break;
            }
            case 'veblen': {
                break;
            }
            default: throw new Error("not a limit ordinal: " + stringify(ordinal));
        }
    }
    for (let i = stack.length; i > 0; i--) {
        ordinal = stack[i - 1](ordinal);
    }
    return ordinal;
}

/**
 * @param {OrdinalExpression} ord
 */
export function stringify(ord) {
    /** @type {(OrdinalExpression | string)[]} */
    const queue = [ord];
    while (!(queue.length === 1 && typeof queue[0] === 'string')) {
        /** @type {(OrdinalExpression | string)[]} */
        const newQueue = [];
        for (const elem of queue) {
            if (typeof elem === 'string') {
                newQueue.push(elem);
            } else if (typeof elem === 'number') {
                newQueue.push(elem.toString());
            } else {
                switch (elem.type) {
                    case 'omega': newQueue.push('omega'); break;
                    case 'plus':
                        for (let i = 0, a = elem.subexpressions; i < a.length; i++) {
                            if (i > 0) newQueue.push('+');
                            newQueue.push(a[i]);
                        }
                        break;
                    case 'times':
                        for (const sub of elem.subexpressions) {
                            newQueue.push(sub);
                        }
                        break;
                    case 'power':
                        newQueue.push(elem.base, '^', elem.power);
                        break;
                }
            }
        }
        queue.length = 0;
        let accumulator = '';
        for (const elem of newQueue) {
            if (typeof elem === 'string') {
                accumulator += elem;
            } else {
                if (accumulator.length > 0) {
                    queue.push(accumulator);
                }
                queue.push(elem);
            }
        }
        if (accumulator.length > 0) {
            queue.push(accumulator);
        }
    }
    return queue[0];
}

/**
 * @param {OrdinalExpression} ord
 * @returns {OrdinalExpression}
 */
export function successor(ord) {
    if (typeof ord === 'number') return ord + 1;
    if (ord.type === 'plus') {
        const last = ord.subexpressions[ord.subexpressions.length - 1];
        if (typeof last === 'number') {
            return {type: 'plus', subexpressions: replacePart(ord.subexpressions, -1, last + 1)};
        } else {
            return {type: 'plus', subexpressions: ord.subexpressions.concat([1])};
        }
    }
    return makePlus([ord, 1]);
}

/**
 * Find the smallest limit ordinal a such that a[n] <= ord < a.
 * @param {OrdinalExpression} ordinal Ordinal to upgrade
 * @param {number} n
 * @param {MaximizerOptions} opt
 */
export function maximizeOne(ordinal, n, opt) {
    /** @type {OrdinalExpression | null} */
    let ret = null;
    /** @type {MaximizerExecutor[]} */
    const runnables = [];
    maximizeOneAsync(ordinal, ret2 => { ret = ret2 }, run => runnables.push(run));
    while (runnables.length > 0) {
        // @ts-ignore
        runnables.pop()(n, opt);
    }
    return ret;
}

/**
 * Find the smallest limit ordinal a such that a[n] <= ord < a.
 * @param {OrdinalExpression} ordinal Ordinal to upgrade
 * @param {(ret: OrdinalExpression | null) => void} cb
 * @param {(run: MaximizerExecutor) => void} exec
 */
export function maximizeOneAsync(ordinal, cb, exec) {
    exec((n, opt) => {
        if (typeof ordinal === 'number') {
            cb(ordinal >= n ? OMEGA : null);
            return;
        }
        switch (ordinal.type) {
            case 'omega': cb(null); break;
            case 'plus': maximizePlusOrTimes(ordinal.subexpressions, 'plus', cb, exec); return;
            case 'times': maximizePlusOrTimes(ordinal.subexpressions, 'times', cb, exec); return;
            case 'power': maximizeOneAsync(ordinal.power, ret => {
                cb(ret === null ? null : makePower(ordinal.base, ret));
            }, exec); return;
            default: throw new Error(`Not a limit ordinal: ${stringify(ordinal)}`);
        }
    });
}

/**
 * @param {OrdinalExpression[]} ords Ordinal to upgrade
 * @param {'plus' | 'times'} mode
 * @param {(ret: OrdinalExpression | null) => void} cb
 * @param {(run: MaximizerExecutor) => void} exec
 */
function maximizePlusOrTimes(ords, mode, cb, exec) {
    let i = 0;
    const cont = mode === 'plus' ? makePlus : makeTimes;
    /**
     * @param {number} n
     * @param {MaximizerOptions} opt
     */
    function doIt(n, opt) {
        if (i < ords.length) {
            maximizeOneAsync(ords[ords.length - 1 - i], ret => {
                if (ret !== null && (i + 1 === ords.length || compare(ords[ords.length - i - 2], ret) >= 0) && compare(cont(ords.slice(ords.length - i - 1)), foundamentalSequence(ret, n)) >= 0) {
                    const ords2 = ords.slice(0, ords.length - i - 1);
                    ords2.push(ret);
                    cb(cont(ords2));
                } else {
                    i++;
                    exec(doIt);
                }
            }, exec);
        } else cb(null);
    }
    exec(doIt);
}

/**
 * @param {OrdinalExpression} ordinal1
 * @param {OrdinalExpression} ordinal2
 */
export function compare(ordinal1, ordinal2) {
    /** @type {Ordering} */
    let ret = 0;
    /** @type {(() => void)[]} */
    const runnables = [];
    compareAsync(ordinal1, ordinal2, ret2 => { ret = ret2 }, r => runnables.push(r));
    while (runnables.length > 0) {
        // @ts-ignore
        runnables.pop()();
    }
    return ret;
}

/**
 * @param {OrdinalExpression} ordinal1
 * @param {OrdinalExpression} ordinal2
 * @param {(ret: Ordering) => void} cb
 * @param {(run: () => void) => void} exec
 */
export function compareAsync(ordinal1, ordinal2, cb, exec) {
    exec(() => {
        if (typeof ordinal1 === 'number') {
            if (typeof ordinal2 === 'number') {
                cb(ordinal1 > ordinal2 ? 1 : ordinal1 === ordinal2 ? 0 : -1);
            } else {
                cb(-1);
            }
            return;
        }
        if (typeof ordinal2 === 'number') {
            cb(1);
            return;
        }
        if (ordinal1.type === 'omega') {
            cb(ordinal2.type === 'omega' ? 0 : -1);
            return;
        }
        if (ordinal2.type === 'omega') {
            cb(1);
            return;
        }
        if (ordinal1.type === 'omega-n') {
            if (ordinal2.type === 'omega-n') {
                compareAsync(ordinal1.sub, ordinal2.sub, cb, exec);
            } else cb(1);
            return;
        }
        if (ordinal1.type === 'veblen' && ordinal2.type === 'veblen') {
            compareVeblenFunction(ordinal1, ordinal2, cb, exec);
            return;
        }
        if (ordinal1.type === 'plus') {
            lexicographicalCompare(ordinal1.subexpressions, ordinal2.type === 'plus' ? ordinal2.subexpressions : [ordinal2], 0, cb, exec);
            return;
        }
        if (ordinal2.type === 'plus') {
            lexicographicalCompare([ordinal1], ordinal2.subexpressions, 0, cb, exec);
            return;
        }
        if (ordinal1.type === 'times') {
            lexicographicalCompare(ordinal1.subexpressions, ordinal2.type === 'times' ? ordinal2.subexpressions : [ordinal2], 1, cb, exec);
            return;
        }
        if (ordinal2.type === 'times') {
            lexicographicalCompare([ordinal1], ordinal2.subexpressions, 1, cb, exec);
            return;
        }
        if (ordinal1.type === 'power') {
            lexicographicalCompare([ordinal1.base, ordinal1.power], ordinal2.type === 'power' ? [ordinal2.base, ordinal2.power] : [ordinal2, 1], 1, cb, exec);
            return;
        }
        if (ordinal2.type === 'power') {
            lexicographicalCompare([ordinal1, 1], [ordinal2.base, ordinal2.power], 1, cb, exec);
            return;
        }
        throw new Error(`Unimplemented: comparing ${stringify(ordinal1)} and ${stringify(ordinal2)}`);
    });
}

/**
 * @param {OrdinalExpression[]} ords1
 * @param {OrdinalExpression[]} ords2
 * @param {OrdinalExpression} padding
 * @param {(ret: Ordering) => void} cb
 * @param {(run: () => void) => void} exec
 */
function lexicographicalCompare(ords1, ords2, padding, cb, exec) {
    let i = 0;
    function cmp() {
        if (i < ords1.length || i < ords2.length) {
            compareAsync(i < ords1.length ? ords1[i] : padding, i < ords2.length ? ords2[i] : padding, ret => {
                if (ret === 0) {
                    i++;
                    exec(cmp);
                } else {
                    cb(ret);
                }
            }, exec);
        } else {
            cb(0);
        }
    }
    exec(cmp);
}

/**
 * @param {NestedArrayExpression} arr1
 * @param {NestedArrayExpression} arr2
 * @param {(ret: Ordering) => void} cb
 * @param {(run: () => void) => void} exec
 */
function compareNestedArray(arr1, arr2, cb, exec) {
    let i = 0;
    function compareKw() {
        if (i < arr1.kw.length && i < arr2.kw.length) {
            const kw1 = arr1.kw[i];
            const kw2 = arr2.kw[i];
            compareNestedArray(kw1[0], kw2[0], ret => {
                if (ret === 0) {
                    compareAsync(kw1[1], kw2[1], ret2 => {
                        if (ret2 === 0) {
                            i++;
                            exec(compareKw);
                        } else cb(ret2);
                    }, exec);
                } else cb(ret);
            }, exec);
        } else if (i < arr1.kw.length) {
            cb(1);
        } else if (i < arr2.kw.length) {
            cb(-1);
        } else {
            if (arr1.positional.length > arr2.positional.length) {
                cb(1);
            } else if (arr1.positional.length < arr2.positional.length) {
                cb(-1);
            } else {
                i = 0;
                exec(comparePositional);
            }
        }
    }
    function comparePositional() {
        const pos1 = arr1.positional, pos2 = arr2.positional;
        if (i < pos1.length) {
            compareAsync(pos1[i], pos2[i], ret => {
                if (ret === 0) {
                    i++;
                    exec(comparePositional);
                } else cb(ret);
            }, exec);
        } else cb(0);
    }
    exec(compareKw);
}

/**
 * @param {VeblenFunction} fn1
 * @param {VeblenFunction} fn2
 * @param {(ret: Ordering) => void} cb
 * @param {(run: () => void) => void} exec
 */
function compareVeblenFunction(fn1, fn2, cb, exec) {
    
}

/**
 * @param {OrdinalExpression} ord
 * @param {number} base
 * @param {MaximizerOptions} opt
 */
export function maximize(ord, base, opt) {
    let m = maximizeOne(ord, base, opt);
    while (m !== null) {
        ord = m;
        m = maximizeOne(ord, base, opt);
    }
    return ord;
}
