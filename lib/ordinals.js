/** @import { VeblenFunction, MaximizerOptions, NestedArrayExpression, Ordering, MaximizerExecutor, NestedArrayTerm, NestedArrayCoord, Ordinal, CompoundOrdinal, DisplayNotation, DisplayOptions } from './types.js' */

const CHAR_LOWER_OMEGA = '\u03C9';
const CHAR_UPPER_OMEGA = '\u03A9';
const CHAR_LOWER_PHI = '\u03C6';
const CHAR_LOWER_PSI = '\u03C8';

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
 * @param {Ordinal} ord
 * @returns {Ordinal | null}
 */
function separateSuccessor(ord) {
    if (typeof ord === 'number') {
        return ord > 0 ? ord - 1 : null;
    } else if (ord instanceof Plus) {
        const ret = separateSuccessor(ord.subexpressions[ord.subexpressions.length - 1]);
        return ret !== null ? new Plus(replacePart(ord.subexpressions, -1, ret)).evaluate() : null;
    } else return null;
}

/**
 * @param {Ordinal} ord
 * @returns {[Ordinal, number]}
 */
function separateConstCoef(ord) {
    if (typeof ord === 'number') {
        return [1, ord];
    } else if (ord instanceof Times) {
        const sub = ord.subexpressions;
        const last = sub[sub.length - 1];
        if (typeof last === 'number') {
            if (sub.length === 2) {
                return [sub[0], last];
            } else {
                return [new Times(sub.slice(0, -1)), last];
            }
        }
    }
    return [ord, 1];
}

/**
 * @param {Ordinal} ord
 * @returns {[Ordinal, Ordinal]}
 */
function separatePower(ord) {
    if (ord instanceof Power) {
        return [ord.base, ord.power];
    } else {
        return [ord, 1];
    }
}

/** @implements {CompoundOrdinal} */
export class Omega {
    /**
     * @param {number} n
     * @param {((ord: Ordinal) => Ordinal)[]} stack
     * @returns {[Ordinal, boolean]}
     */
    foundamentalSequenceStep(n, stack) {
        return [n, true];
    }
    /**
     * @param {CompoundOrdinal} other
     * @param {(ret: Ordering) => void} cb
     * @param {(run: () => void) => void} exec
     */
    compareAsync(other, cb, exec) {
        if (typeof other === 'number') {
            exec(() => cb(1));
            return;
        }
        if (other instanceof Omega) {
            exec(() => cb(0));
            return;
        } else {
            exec(() => cb(-1));
            return;
        }
    }
    /**
     * @param {(ret: Ordinal | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        exec((n, opt) => null);
    }
    stringifyOne() {
        return ['omega'];
    }
    /**
     * @param {(Ordinal | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayNotation[][]} stack
     * @param {DisplayOptions} opt
     */
    toDisplayNotationOne(todo, stack, opt) {
        stack.push([{type: 'mi', value: CHAR_LOWER_OMEGA}]);
    }
}

export const OMEGA = new Omega();

/** @implements {CompoundOrdinal} */
export class Plus {
    /**
     * @param {Ordinal[]} subexpressions
     */
    constructor(subexpressions) {
        this.subexpressions = subexpressions;
    }
    stringifyOne() {
        /** @type {(Ordinal | string)[]} */
        const ret = [];
        for (let i = 0, a = this.subexpressions; i < a.length; i++) {
            if (i > 0) {
                ret.push('+');
            }
            ret.push(a[i]);
        }
        return ret;
    }
    /**
     * @param {(Ordinal | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayOptions} opt
     * @param {DisplayNotation[][]} stack
     */
    toDisplayNotationOne(todo, stack, opt) {
        const len = this.subexpressions.length;
        todo.push(stack => {
            /** @type {DisplayNotation[]} */
            const ret = [];
            for (let i = 0; i < len; i++) {
                if (i > 0) {
                    ret.push({type: 'mo', value: '+'});
                }
                ret.push(...stack[stack.length - 1 - i]);
            }
            stack.length -= len;
            stack.push(ret);
        });
        todo.push(...this.subexpressions);
    }
    /**
     * @param {number} n
     * @param {((ord: Ordinal) => Ordinal)[]} stack
     * @returns {[Ordinal, boolean]}
     */
    foundamentalSequenceStep(n, stack) {
        stack.push(ord => new Plus(replacePart(this.subexpressions, -1, ord)).evaluate());
        return [this.subexpressions[this.subexpressions.length - 1], false];
    }
    /**
     * @param {CompoundOrdinal} other
     * @param {(ret: Ordering) => void} cb
     * @param {(run: () => void) => void} exec
     */
    compareAsync(other, cb, exec) {
        lexicographicalCompare(this.subexpressions, other instanceof Plus ? other.subexpressions : [other], 0, cb, exec);
    }
    /**
     * @param {(ret: Ordinal | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        maximizePlusOrTimes(this.subexpressions, 'plus', cb, exec);
    }
    evaluate() {
        /** @type {Ordinal[]} */
        const flattened = [];
        for (const arg of this.subexpressions) {
            if (arg instanceof Plus) {
                for (const arg2 of arg.subexpressions) {
                    flattened.push(arg2);
                }
            } else {
                flattened.push(arg);
            }
        }
        const args = flattened.filter(a => a !== 0);
        if (args.length === 0) {
            return 0;
        } else if (args.length === 1) {
            return args[0];
        } else {
            /** @type {Ordinal[]} */
            const args2 = [];
            let [accumulator, coef] = separateConstCoef(args[0]);
            for (let i = 1; i < args.length; i++) {
                let [factor, coef2] = separateConstCoef(args[i]);
                if (compare(factor, accumulator) === 0) {
                    coef += coef2;
                } else {
                    if (coef > 1) {
                        args2.push(new Times([accumulator, coef]).evaluate());
                    } else {
                        args2.push(accumulator);
                    }
                    accumulator = factor;
                    coef = coef2;
                }
            }
            if (coef > 1) {
                args2.push(new Times([accumulator, coef]).evaluate());
            } else {
                args2.push(accumulator);
            }
            return args2.length > 1 ? new Plus(args2) : args2[0];
        }
    }
}

/** @implements {CompoundOrdinal} */
export class Times {
    /**
     * @param {Ordinal[]} subexpressions
     */
    constructor(subexpressions) {
        this.subexpressions = subexpressions;
    }
    /**
     * @param {number} n
     * @param {((ord: Ordinal) => Ordinal)[]} stack
     * @returns {[Ordinal, boolean]}
     */
    foundamentalSequenceStep(n, stack) {
        const last = this.subexpressions[this.subexpressions.length - 1];
        if (typeof last === 'number') {
            const sub = new Times(replacePart(this.subexpressions, -1, last - 1)).evaluate();
            stack.push(ord1 => new Plus([sub, ord1]).evaluate());
            return [new Times(this.subexpressions.slice(0, -1)), false];
        } else {
            stack.push(ord => new Times(replacePart(this.subexpressions, -1, ord)).evaluate());
            return [last, false];
        }
    }
    /**
     * @param {CompoundOrdinal} other
     * @param {(ret: Ordering) => void} cb
     * @param {(run: () => void) => void} exec
     */
    compareAsync(other, cb, exec) {
        lexicographicalCompare(this.subexpressions, other instanceof Times ? other.subexpressions : [other], 1, cb, exec);
    }
    /**
     * @param {(ret: Ordinal | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        maximizePlusOrTimes(this.subexpressions, 'times', cb, exec);
    }
    stringifyOne() {
        /** @type {(Ordinal | string)[]} */
        const ret = [];
        for (let i = 0, a = this.subexpressions; i < a.length; i++) {
            ret.push(a[i]);
        }
        return ret;
    }
    /**
     * @param {(Ordinal | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayOptions} opt
     * @param {DisplayNotation[][]} stack
     */
    toDisplayNotationOne(todo, stack, opt) {
        const len = this.subexpressions.length;
        todo.push(stack => {
            /** @type {DisplayNotation[]} */
            const ret = [];
            for (let i = 0; i < len; i++) {
                ret.push(...stack[stack.length - i - 1]);
            }
            stack.length -= len;
            stack.push(ret);
        });
        todo.push(...this.subexpressions);
    }
    evaluate() {
        if (this.subexpressions.some(o => o === 0)) {
            return 0;
        }
        const args = this.subexpressions.filter(a => a !== 1);
        if (args.length === 0) {
            return 1;
        } else if (args.length === 1) {
            return args[0];
        } else {
            /** @type {Ordinal[]} */
            const args2 = [];
            let [accumulator, pow] = separatePower(args[0]);
            for (let i = 1; i < args.length; i++) {
                let [base2, pow2] = separatePower(args[i]);
                if (compare(accumulator, base2) === 0) {
                    pow = new Plus([pow, pow2]).evaluate();
                } else {
                    args2.push(new Power(accumulator, pow).evaluate());
                    accumulator = base2;
                    pow = pow2;
                }
            }
            args2.push(new Power(accumulator, pow).evaluate());
            return args2.length === 1 ? args2[0] : new Times(args2);
        }
    }
}

/** @implements {CompoundOrdinal} */
export class Power {
    /**
     * @param {Ordinal} base
     * @param {Ordinal} power
     */
    constructor(base, power) {
        this.base = base;
        this.power = power;
    }
    /**
     * @param {number} n
     * @param {((ord: Ordinal) => Ordinal)[]} stack
     * @returns {[Ordinal, boolean]}
     */
    foundamentalSequenceStep(n, stack) {
        const pow = separateSuccessor(this.power);
        if (pow !== null) {
            stack.push(ord => new Times([
                new Power(this.base, pow).evaluate(),
                ord
            ]).evaluate());
            return [this.base, false];
        } else {
            stack.push(ord => new Power(this.base, ord).evaluate());
            return [this.power, false];
        }
    }
    /**
     * @param {CompoundOrdinal} other
     * @param {(ret: Ordering) => void} cb
     * @param {(run: () => void) => void} exec
     */
    compareAsync(other, cb, exec) {
        lexicographicalCompare([this.base, this.power], other instanceof Power ? [other.base, other.power] : [other, 1], 1, cb, exec);
    }
    /**
     * @param {(ret: Ordinal | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        maximizeOneAsync(this.power, ret => {
            exec(() => cb(ret === null ? null : new Power(this.base, ret).evaluate()));
        }, exec);
    }
    stringifyOne() {
        return [this.base, "^", this.power];
    }
    /**
     * @param {(Ordinal | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayOptions} opt
     * @param {DisplayNotation[][]} stack
     */
    toDisplayNotationOne(todo, stack, opt) {
        todo.push(stack => {
            const base = stack[stack.length - 2];
            const pow = stack[stack.length - 1];
            stack.length -= 2;
            stack.push([{type: 'superscript', superscript: pow, expr: base}]);
        });
        todo.push(this.power, this.base);
    }
    evaluate() {
        if (this.power === 0) {
            return 1;
        } else if (this.power === 1) {
            return this.base;
        } else return this;
    }
}

/**
 * @param {Ordinal} ordinal
 * @param {number} n
 */
export function foundamentalSequence(ordinal, n) {
    const ordinal0 = ordinal;
    /** @type {((ord: Ordinal) => Ordinal)[]} */
    const stack = [];
    while (true) {
        if (typeof ordinal === 'number') {
            throw new Error('number is not a limit ordinal');
        }
        const [next, done] = ordinal.foundamentalSequenceStep(n, stack);
        ordinal = next;
        if (done) {
            break;
        }
    }
    for (let i = stack.length; i > 0; i--) {
        ordinal = stack[i - 1](ordinal);
    }
    return ordinal;
}

/**
 * @param {Ordinal} ord
 */
export function stringify(ord) {
    /** @type {(Ordinal | string)[]} */
    const queue = [ord];
    while (!(queue.length === 1 && typeof queue[0] === 'string')) {
        /** @type {(Ordinal | string)[]} */
        const newQueue = [];
        for (const elem of queue) {
            if (typeof elem === 'string') {
                newQueue.push(elem);
            } else if (typeof elem === 'number') {
                newQueue.push(elem.toString());
            } else {
                newQueue.push(...elem.stringifyOne());
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
 * @param {Ordinal} ord
 * @returns {Ordinal}
 */
export function successor(ord) {
    if (typeof ord === 'number') return ord + 1;
    if (ord instanceof Plus) {
        const last = ord.subexpressions[ord.subexpressions.length - 1];
        if (typeof last === 'number') {
            return new Plus(replacePart(ord.subexpressions, -1, last + 1));
        } else {
            return new Plus(ord.subexpressions.concat([1]));
        }
    }
    return new Plus([ord, 1]).evaluate();
}

/**
 * @param {Ordinal} ord
 * @param {Ordinal} base
 */
function isPowerTowerOf(ord, base) {
    /** @type {Ordinal[]} */
    const toCheck = [ord];
    while (toCheck.length > 0) {
        /** @type {Ordinal} */
        // @ts-ignore
        const top = toCheck.pop();
        if (top instanceof Plus || top instanceof Times) {
            toCheck.push(top.subexpressions[0]);
        } else if (top instanceof Power) {
            if (!compare(base, top.base)) {
                return false;
            }
            toCheck.push(top.power);
        } else {
            return compare(ord, base) === 0;
        }
    }
    return true;
}

/**
 * Find the smallest limit ordinal a such that a[n] <= ord < a.
 * @param {Ordinal} ordinal Ordinal to upgrade
 * @param {number} n
 * @param {MaximizerOptions} opt
 */
export function maximizeOne(ordinal, n, opt) {
    /** @type {Ordinal | null} */
    let ret = null;
    /** @type {MaximizerExecutor[]} */
    const runnables = [];
    maximizeOneAsync(ordinal, ret2 => {
        ret = ret2
    }, run => runnables.push(run));
    while (runnables.length > 0) {
        // @ts-ignore
        runnables.pop()(n, opt);
    }
    return ret;
}

/**
 * Find the smallest limit ordinal a such that a[n] <= ord < a.
 * @param {Ordinal} ordinal Ordinal to upgrade
 * @param {(ret: Ordinal | null) => void} cb
 * @param {(run: MaximizerExecutor) => void} exec
 */
export function maximizeOneAsync(ordinal, cb, exec) {
    exec((n, opt) => {
        if (typeof ordinal === 'number') {
            exec(() => cb(ordinal >= n ? OMEGA : null));
            return;
        } else {
            ordinal.maximizeAsync(cb, exec);
        }
    });
}

/**
 * @param {Ordinal[]} ords Ordinal to upgrade
 * @param {'plus' | 'times'} mode
 * @param {(ret: Ordinal | null) => void} cb
 * @param {(run: MaximizerExecutor) => void} exec
 */
function maximizePlusOrTimes(ords, mode, cb, exec) {
    let i = 0;
    /** @type {(n: Ordinal[]) => Ordinal} */
    const cont = mode === 'plus' ? n => new Plus(n).evaluate() : n => new Times(n).evaluate();
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
                    exec(() => cb(cont(ords2)));
                } else {
                    i++;
                    exec(doIt);
                }
            }, exec);
        } else exec(() => cb(null));
    }
    exec(doIt);
}

/**
 * @param {Ordinal} ordinal1
 * @param {Ordinal} ordinal2
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
 * @param {Ordinal} ord
 * @param {DisplayOptions} opt
 */
export function toDisplayNotation(ord, opt) {
    /** @type {(Ordinal | ((stack: DisplayNotation[][]) => void))[]} */
    const todo = [ord];
    /** @type {DisplayNotation[][]} */
    const stack = [];
    while (todo.length > 0) {
        /** @type {typeof todo[0]} */
        // @ts-ignore
        const top = todo.pop();
        if (typeof top === 'function') {
            top(stack);
        } else if (typeof top === 'number') {
            stack.push([top]);
        } else {
            top.toDisplayNotationOne(todo, stack, opt);
        }
    }
    return stack[0];
}

/**
 * @param {Ordering} ordering
 */
function reverseOrdering(ordering) {
    switch (ordering) {
        case 0: return 0; // avoids `-0`
        case 1: return -1;
        case -1: return 1;
    }
}

/**
 * @param {Ordinal} ord1
 * @param {Ordinal} ord2
 * @param {(ret: Ordering) => void} cb
 * @param {(run: () => void) => void} exec
 */
export function compareAsync(ord1, ord2, cb, exec) {
    if (typeof ord1 === 'number') {
        if (typeof ord2 === 'number') {
            exec(() => cb(ord1 > ord2 ? 1 : ord1 === ord2 ? 0 : -1));
        } else {
            exec(() => cb(-1));
        }
        return;
    }
    if (typeof ord2 === 'number') {
        exec(() => cb(1));
        return;
    }
    if (ord2 instanceof Plus || !(ord1 instanceof Plus) && ord2 instanceof Times || !(ord1 instanceof Plus) && !(ord1 instanceof Times) && ord2 instanceof Power) {
        ord2.compareAsync(ord1, ret => cb(reverseOrdering(ret)), exec);
        return;
    }
    ord1.compareAsync(ord2, cb, exec);
}

/**
 * @param {Ordinal[]} ords1
 * @param {Ordinal[]} ords2
 * @param {Ordinal} padding
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
                    exec(() => cb(ret));
                }
            }, exec);
        } else {
            exec(() => cb(0));
        }
    }
    exec(cmp);
}

/**
 * @template {NestedArrayCoord} T
 * @param {T} arr
 * @returns {T is NestedArrayExpression}
 */
function isNestedArray(arr) {
    return typeof arr === 'object' && 'kw' in arr;
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
 * @param {Ordinal} ord
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
