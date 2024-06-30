/** @import { OrdinalExpression, VeblenFunction } from './types.js' */
/** @import { ComparingFrame, ComparatorState, MaximizerFrame, MaximizerState } from './internal.js' */

/** @type {OrdinalExpression} */
export const ZERO = {type: 'number', value: 0};
/** @type {OrdinalExpression} */
export const ONE = {type: 'number', value: 1};
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
        switch (ordinal.type) {
            case 'number': return false;
            case 'plus': ordinal = ordinal.subexpressions[ordinal.subexpressions.length - 1];
            default: return true;
        }
    }
}

/**
 * @param {OrdinalExpression} ord
 * @returns {OrdinalExpression | null}
 */
function separateSuccessor(ord) {
    switch (ord.type) {
        case 'number': {
            if (ord.value > 0) {
                return {type: 'number', value: ord.value - 1};
            } else return null;
        }
        case 'plus': {
            const ret = separateSuccessor(ord.subexpressions[ord.subexpressions.length - 1]);
            return ret !== null ? makePlus(replacePart(ord.subexpressions, -1, ret)) : null;
        }
        default: return null;
    }
}

/**
 * @param {OrdinalExpression} ord
 * @returns {[OrdinalExpression, number]}
 */
function separateConstCoef(ord) {
    switch (ord.type) {
        case 'number': return [ONE, ord.value];
        case 'times': {
            const sub = ord.subexpressions;
            const last = sub[sub.length - 1];
            if (last.type === 'number') {
                if (sub.length === 2) {
                    return [sub[0], last.value];
                } else {
                    return [{type: 'times', subexpressions: sub.slice(0, -1)}, last.value];
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
    if (ord.type === 'power') {
        return [ord.base, ord.power];
    } else {
        return [ord, ONE];
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
        if (arg.type === 'plus') {
            for (const arg2 of arg.subexpressions) {
                flattened.push(arg2);
            }
        } else {
            flattened.push(arg);
        }
    }
    args = flattened.filter(a => !(a.type === 'number' && a.value === 0));
    if (args.length === 0) {
        return ZERO;
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
                    args2.push(makeTimes([accumulator, {type: 'number', value: coef}]));
                } else {
                    args2.push(accumulator);
                }
                accumulator = factor;
                coef = coef2;
            }
        }
        if (coef > 1) {
            args2.push(makeTimes([accumulator, {type: 'number', value: coef}]));
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
    if (args.some(o => o.type === 'number' && o.value === 0)) {
        return ZERO;
    }
    args = args.filter(a => !(a.type === 'number' && a.value === 1));
    if (args.length === 0) {
        return ONE;
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
    if (base.type === 'omega') {
        if (power.type === 'veblen' && (power.args.positionalArgs.length > 2 || power.args.kwArgs.length > 0)) {
            return power;
        }
    }
    if (power.type === 'number') {
        if (power.value === 0) {
            return ONE;
        } else if (power.value === 1) {
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
        switch (ordinal.type) {
            case 'omega': {
                ordinal = {type: 'number', value: n};
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
                if (last.type === 'number') {
                    ordinal = makeTimes(ordinal.subexpressions.slice(0, -1));
                    stack.push(ord1 => makePlus([
                        makeTimes(replacePart(ord.subexpressions, -1, {type: 'number', value: last.value - 1})),
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
                const args = ordinal.args;
                
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
            } else {
                switch (ord.type) {
                    case 'number': newQueue.push(ord.value.toString()); break;
                    case 'omega': newQueue.push('omega'); break;
                    case 'plus':
                        for (let i = 0, a = ord.subexpressions; i < a.length; i++) {
                            if (i > 0) newQueue.push('+');
                            newQueue.push(a[i]);
                        }
                        break;
                    case 'times':
                        for (const sub of ord.subexpressions) {
                            newQueue.push(sub);
                        }
                        break;
                    case 'power':
                        newQueue.push(ord.base, '^', ord.power);
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
    if (ord.type === 'number') return {type: 'number', value: ord.value + 1};
    if (ord.type === 'plus') {
        const last = ord.subexpressions[ord.subexpressions.length - 1];
        if (last.type === 'number') {
            return {type: 'plus', subexpressions: replacePart(ord.subexpressions, -1, {type: 'number', value: last.value + 1})};
        } else {
            return {type: 'plus', subexpressions: ord.subexpressions.concat([ONE])};
        }
    }
    return makePlus([ord, ONE]);
}

/**
 * @param {OrdinalExpression[]} ordinals
 */
export function argmax(ordinals) {
    let max = 0;
    for (let i = 1; i < ordinals.length; i++) {
        if (compare(ordinals[i], ordinals[max]) > 0) {
            max = i;
        }
    }
    return max;
}

/** @implements {MaximizerFrame} */
class InitialMaximizerFrame {
    /**
     * @param {OrdinalExpression} ordinal
     */
    constructor(ordinal) {
        /** @type {OrdinalExpression} */
        this.ordinal = ordinal;
    }
    /**
     * @param {MaximizerState} state
     * @param {number} n
     */
    doIt(state, n) {
        const ord = this.ordinal;
        state.stack.pop();
        switch (ord.type) {
            case 'number': state.ret = ord.value >= n ? OMEGA : null; break;
            case 'omega': state.ret = null; break;
            case 'plus':
                state.stack.push(new PlusAndTimesMaximizerFrame(ord.subexpressions, 'plus'));
                break;
            case 'times':
                state.stack.push(new PlusAndTimesMaximizerFrame(ord.subexpressions, 'times'));
                break;
            case 'power': {
                state.stack.push(new PowerMaximizerFrame(ord.base));
                state.stack.push(new InitialMaximizerFrame(ord.power));
                break;
            }
            default: throw new Error(`Not a limit ordinal: ${stringify(ord)}`);
        }
    }
}

/** @implements {MaximizerFrame} */
class PlusAndTimesMaximizerFrame {
    /**
     * @param {OrdinalExpression[]} ordinals
     * @param {'plus' | 'times'} retType
     */
    constructor(ordinals, retType) {
        /** @type {OrdinalExpression[]} */
        this.ordinals = ordinals;
        /** @type {"plus" | "times"} */
        this.retType = retType;
        /** @type {number} */
        this.cursor = 0;
    }
    /**
     * @param {MaximizerState} state
     * @param {number} n
     */
    doIt(state, n) {
        const ords = this.ordinals;
        const cont = this.retType === 'plus' ? makePlus : makeTimes;
        if (this.cursor > 0 && state.ret !== null && (this.cursor === ords.length || compare(ords[ords.length - this.cursor - 1], state.ret) >= 0) && compare(cont(ords.slice(ords.length - this.cursor)), foundamentalSequence(state.ret, n)) >= 0) {
            state.stack.pop();
            const ords2 = ords.slice(0, ords.length - this.cursor);
            ords2.push(state.ret);
            state.ret = cont(ords2);
        } else if (this.cursor === 0 || this.cursor < ords.length) {
            state.stack.push(new InitialMaximizerFrame(ords[ords.length - 1 - this.cursor]));
            this.cursor++;
        } else {
            state.ret = null;
            state.stack.pop();
        }
    }
}

/** @implements {MaximizerFrame} */
class PowerMaximizerFrame {
    /**
     * @param {OrdinalExpression} base
     */
    constructor(base) {
        /** @type {OrdinalExpression} */
        this.base = base;
    }
    /**
     * @param {MaximizerState} state
     * @param {number} n
     */
    doIt(state, n) {
        state.stack.pop();
        state.ret = state.ret === null ? null : makePower(this.base, state.ret);
    }
}

/**
 * Find the smallest limit ordinal a such that a[n] <= ord < a.
 * @param {OrdinalExpression} ordinal Ordinal to upgrade
 * @param {number} n
 */
export function maximizeOne(ordinal, n) {
    /** @type {MaximizerState} */
    const state = { ret: null, stack: [new InitialMaximizerFrame(ordinal)] };
    while (state.stack.length > 0) {
        last(state.stack).doIt(state, n);
    }
    return state.ret;
}

/**
 * @implements {ComparingFrame}
 */
class InitialComparingFrame {
    /**
     * @param {OrdinalExpression} ordinal1
     * @param {OrdinalExpression} ordinal2
     */
    constructor(ordinal1, ordinal2) {
        /** @type {OrdinalExpression} */
        this.ordinal1 = ordinal1;
        /** @type {OrdinalExpression} */
        this.ordinal2 = ordinal2;
    }
    /**
     * @param {ComparatorState} state
     */
    doIt(state) {
        state.stack.pop();
        const ord1 = this.ordinal1;
        const ord2 = this.ordinal2;
        if (ord1.type === 'plus') {
            state.stack.push(new LexicographicalComparator(ord1.subexpressions, ord2.type === 'plus' ? ord2.subexpressions : [ord2], ZERO));
            return;
        }
        if (ord2.type === 'plus') {
            state.stack.push(new LexicographicalComparator([ord1], ord2.subexpressions, ZERO));
            return;
        }
        if (ord1.type === 'times') {
            state.stack.push(new LexicographicalComparator(ord1.subexpressions, ord2.type === 'times' ? ord2.subexpressions : [ord2], ONE));
            return;
        }
        if (ord2.type === 'times') {
            state.stack.push(new LexicographicalComparator([ord1], ord2.subexpressions, ONE));
            return;
        }
        if (ord1.type === 'power') {
            state.stack.push(new LexicographicalComparator([ord1.base, ord1.power], ord2.type === 'power' ? [ord2.base, ord2.power] : [ord2], ONE));
            return;
        }
        // if (ord2.type === 'power') {
        //     state.stack.push(new LexicographicalComparator([ord1], [ord2.base, ord2.power], ONE));
        //     return;
        // }
        switch (ord1.type) {
            case 'number':
                if (ord2.type === 'number') {
                    state.ret = ord1.value > ord2.value ? 1 : ord1.value === ord2.value ? 0 : -1;
                } else state.ret = -1;
                return;
            case 'omega':
                switch (ord2.type) {
                    case 'number': state.ret = 1; break;
                    case 'omega': state.ret = 0; break;
                    default: state.ret = -1;
                }
                return;
        }
        throw new Error(`Unimplemented: comparing ${stringify(ord1)} and ${stringify(ord2)}`);
    }
}

/**
 * @implements {ComparingFrame}
 */
class LexicographicalComparator {
    /**
     * @param {OrdinalExpression[]} ords1
     * @param {OrdinalExpression[]} ords2
     * @param {OrdinalExpression} padding
     */
    constructor(ords1, ords2, padding) {
        /** @type {OrdinalExpression[]} */
        this.ords1 = ords1;
        /** @type {OrdinalExpression[]} */
        this.ords2 = ords2;
        /** @type {OrdinalExpression} */
        this.padding = padding;
        /** @type {number} */
        this.i = 0;
    }
    /**
     * @param {ComparatorState} state
     */
    doIt(state) {
        if (this.i > 0 && state.ret !== 0) {
            state.stack.pop();
            return;
        }
        const ords1 = this.ords1;
        const ords2 = this.ords2;
        if (this.i < ords1.length || this.i < ords2.length) {
            state.stack.push(new InitialComparingFrame(this.i < ords1.length ? ords1[this.i] : this.padding, this.i < ords2.length ? ords2[this.i] : this.padding));
            this.i++;
        } else {
            state.stack.pop();
        }
    }
}

/**
 * Compare two ordinals, non-recursion implementation
 * @param {OrdinalExpression} ordinal1
 * @param {OrdinalExpression} ordinal2
 * @returns {1 | -1 | 0}
 */
export function compare(ordinal1, ordinal2) {
    /** @type {ComparatorState} */
    const state = { ret: 0, stack: [new InitialComparingFrame(ordinal1, ordinal2)] };
    while (state.stack.length > 0) {
        last(state.stack).doIt(state);
    }
    return state.ret;
}

/**
 * @param {OrdinalExpression} ord
 * @param {number} base
 */
export function maximize(ord, base) {
    let m = maximizeOne(ord, base);
    while (m !== null) {
        ord = m;
        m = maximizeOne(ord, base);
    }
    return ord;
}
