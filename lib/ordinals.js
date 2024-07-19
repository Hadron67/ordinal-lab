/** @import { VeblenFunction, MaximizerOptions, NestedArrayExpression, Ordering, MaximizerExecutor, NestedArrayTerm, NestedArrayCoord, Expression, CompoundExpression, DisplayNotation, DisplayOptions, TracedExpression, EvaluatorCallback, TracedExpressionWithIndex, ExpressionVisitor, Omega, ExpressionTypeMap } from './types.js' */

import { pushReversed } from './utils.js';

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
 * @param {Expression} ord
 * @returns {Expression | null}
 */
function separateSuccessor(ord) {
    if (typeof ord === 'number') {
        return ord > 0 ? ord - 1 : null;
    } else if (ord.type === 'plus') {
        const last = ord.subexpressions[ord.subexpressions.length - 1];
        if (last === 1) {
            if (ord.subexpressions.length === 2) {
                return ord.subexpressions[0];
            } else {
                return {type: 'plus', subexpressions: ord.subexpressions.slice(0, -1)};
            }
        } else if (typeof last === 'number') {
            return {type: 'plus', subexpressions: replacePart(ord.subexpressions, -1, last - 1)};
        } else return null;
    } else return null;
}

/**
 * @param {Expression} ord
 * @returns {[Expression, number]}
 */
function separateConstCoef(ord) {
    if (typeof ord === 'number') {
        return [1, ord];
    } else if (ord.type === 'times') {
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
    return [ord, 1];
}

/**
 * @param {Expression} base
 * @param {Expression} power
 * @returns {Expression}
 */
function evaluatePower(base, power) {
    if (power === 0) {
        return 1;
    } else if (power === 1) {
        return base;
    } else return {type: 'power', base, power};
}

/**
 * @param {Expression[]} factors
 * @returns {Expression}
 */
function evaluateTimes(factors) {
    /** @type {Expression[]} */
    const args = [];
    /** @type {Expression[]} */
    const toFlatten = [];
    pushReversed(toFlatten, factors);
    while (toFlatten.length > 0) {
        /** @type {typeof toFlatten[0]} */
        // @ts-ignore
        const t = toFlatten.pop();
        if (typeof t === 'object' && t.type === 'times') {
            pushReversed(toFlatten, t.subexpressions);
        } else if (t === 0) {
            return 0;
        } else if (t !== 1) {
            args.push(t);
        }
    }
    if (args.length === 0) {
        return 1;
    } else if (args.length === 1) {
        return args[0];
    } else {
        /** @type {Expression[]} */
        const args2 = [];
        let [base1, power1] = separatePower(args[0]);
        /** @type {Expression[]} */
        const powAccumulator = [power1];
        for (let i = 1; i < args.length; i++) {
            const [base2, power2] = separatePower(args[i]);
            if (compareHead(base1, base2) === 0) {
                powAccumulator.push(power2);
            } else {
                args2.push(evaluatePower(base1, powAccumulator.length > 1 ? evaluatePlus(powAccumulator) : powAccumulator[0]));
                base1 = base2;
                powAccumulator.length = 0;
                powAccumulator.push(power2);
            }
        }
        args2.push(evaluatePower(base1, powAccumulator.length > 1 ? evaluatePlus(powAccumulator) : powAccumulator[0]));
        return args2.length > 1 ? {type: 'times', subexpressions: args2} : args2[0];
    }
}

/**
 * @param {Expression[]} terms
 * @returns {Expression}
 */
export function evaluatePlus(terms) {
    /** @type {Expression[]} */
    const args = [];
    /** @type {Expression[]} */
    const toFlatten = [];
    pushReversed(toFlatten, terms);
    while (toFlatten.length > 0) {
        /** @type {typeof toFlatten[0]} */
        // @ts-ignore
        const t = toFlatten.pop();
        if (typeof t === 'object' && t.type === 'plus') {
            pushReversed(toFlatten, t.subexpressions);
        } else if (t !== 0) {
            args.push(t);
        }
    }
    if (args.length === 0) {
        return 0;
    } else if (args.length === 1) {
        return args[0];
    } else {
        /** @type {Expression[]} */
        const args2 = [];
        let [factor1, coef1] = separateConstCoef(args[0]);
        for (let i = 1; i < args.length; i++) {
            const [factor2, coef2] = separateConstCoef(args[i]);
            if (compareExpression(factor1, factor2) === 0) {
                coef1 += coef2;
            } else {
                args2.push(coef1 === 1 ? factor1 : evaluateTimes([factor1, coef1]));
                factor1 = factor2;
                coef1 = coef2;
            }
        }
        args2.push(coef1 === 1 ? factor1 : evaluateTimes([factor1, coef1]));
        return args2.length > 1 ? {type: 'plus', subexpressions: args2} : args2[0];
    }
}

/**
 * @param {Expression} ord
 * @returns {[Expression, Expression]}
 */
function separatePower(ord) {
    if (typeof ord === 'object' && ord.type === 'power') {
        return [ord.base, ord.power];
    } else {
        return [ord, 1];
    }
}

/** @type {(keyof ExpressionTypeMap)[]} */
export const BASIC_TYPE_ORDERS = [
    "number",
    "omega",
    "plus",
    "times",
    "power",
    "lambda",
    "slot"
];

/**
 * @param {number} i
 * @returns {never}
 */
function outOfBounds(i) {
    throw new Error(`index ${i} is out of bounds`);
}

/**
 * @param {Expression} expr
 * @param {number} i
 * @returns {Expression}
 */
export function getChild(expr, i) {
    if (typeof expr === 'object') switch (expr.type) {
        case 'plus':
        case 'times': return expr.subexpressions[i];
        case 'power': switch (i) {
            case 0: return expr.base;
            case 1: return expr.power;
            default: outOfBounds(i);
        }
        case 'lambda': switch (i) {
            case 0: return expr.body;
            case 1: return expr.iterations;
            case 2: if (expr.appliedTo !== void 0) {
                return expr.appliedTo;
            } else outOfBounds(i);
        }
        default: throw new Error(`unimplement type ${expr.type}`);
    } else {
        outOfBounds(i);
    }
}

/** @returns {never} */
function unreachable() {
    throw new Error('reached unreachable code');
}

/**
 * @param {Expression} expr
 * @param {Expression[]} children
 * @returns {Expression}
 */
export function withChildren(expr, children) {
    if (typeof expr === 'number') {
        return expr;
    } else {
        const type = expr.type;
        switch (type) {
            case 'plus': return {type, subexpressions: children};
            case 'times': return {type, subexpressions: children};
            case 'power': return {type, base: children[0], power: children[1]};
            case 'lambda':
                if (children.length === 2) {
                    return {type, args: [...expr.args], body: children[0], iterations: children[1]};
                } else {
                    return {type, args: [...expr.args], body: children[0], iterations: children[1], appliedTo: children[2]};
                }
            case 'slot':
            case 'omega': return expr;
            default: unreachable();
        }
    }
}

/**
 * @param {Expression} expr
 */
export function childrenCount(expr) {
    if (typeof expr === 'object') switch (expr.type) {
        case 'plus':
        case 'times': return expr.subexpressions.length;
        case 'power': return 2;
        case 'lambda': return expr.appliedTo !== void 0 ? 3 : 2;
        case 'omega':
        case 'slot': return 0;
        default: unreachable();
    } else return 0;
}

/**
 * @param {Expression} expr
 */
export function evaluate(expr) {
    if (typeof expr === 'number') {
        return expr;
    } else switch (expr.type) {
        case 'plus': return evaluatePlus(expr.subexpressions);
        case 'times': return evaluateTimes(expr.subexpressions);
        case 'power': return evaluatePower(expr.base, expr.power);
        default: return expr;
    }
}

/**
 * @param {number[]} arr1
 * @param {number[]} arr2
 * @returns {Ordering}
 */
function lexicographicalCompNumbers(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return arr1.length > arr2.length ? 1 : -1;
    }
    for (let i = 0; i < arr1.length; i++) {
        const a1 = arr1[i], a2 = arr2[i];
        if (a1 !== a2) {
            return a1 > a2 ? 1 : -1;
        }
    }
    return 0;
}

/**
 * @param {Expression} expr1
 * @param {Expression} expr2
 * @returns {Ordering}
 */
export function compareHead(expr1, expr2) {
    if (typeof expr1 === 'number') {
        if (typeof expr2 === 'number') {
            return expr1 > expr2 ? 1 : expr1 === expr2 ? 0 : -1;
        } else return -1;
    }
    if (typeof expr2 === 'number') {
        return 1;
    }
    switch (expr1.type) {
        case 'slot':
            if (expr2.type === 'slot') {
                return expr1.id > expr2.id ? 1 : -1;
            }
            break;
        case 'lambda':
            if (expr2.type === 'lambda') {
                return lexicographicalCompNumbers(expr1.args, expr2.args);
            }
            break;
    }
    if (expr1.type !== expr2.type) {
        return expr1.type > expr2.type ? 1 : -1;
    }
    return 0;
}

export class Evaluator {
    constructor() {
        /** @type {((e: Evaluator) => void)[]} */
        this.runnables = [];
    }
    /**
     * @param {(e: Evaluator) => void} runnable
     */
    exec(runnable) {
        this.runnables.push(runnable);
    }
    /**
     * @template T
     * @param {T} val
     * @param {(ret: T, e: Evaluator) => void} cb
     */
    setReturn(val, cb) {
        this.runnables.push(e => cb(val, e));
    }
    run() {
        while (this.runnables.length > 0) {
            // @ts-ignore
            this.runnables.pop()(this);
        }
    }
}

/** @type {Omega} */
export const OMEGA = {type: 'omega'};

/**
 * @param {Expression} expr1
 * @param {Expression} expr2
 */
export function compareExpression(expr1, expr2) {
    /** @type {[Expression, Expression][]} */
    const stack = [[expr1, expr2]];
    while (stack.length > 0) {
        /** @type {typeof stack[0]} */
        // @ts-ignore
        const [e1, e2] = stack.pop();
        if (typeof e1 === 'number') {
            if (typeof e2 === 'number') {
                if (e1 > e2) {
                    return 1;
                } else if (e1 < e2) {
                    return -1;
                } else continue;
            } else return -1;
        }
        if (typeof e2 === 'number') {
            return 1;
        }
        const cp1 = compareHead(e1, e2);
        if (cp1 !== 0) {
            return cp1;
        }
        const len1 = childrenCount(e1), len2 = childrenCount(e2);
        if (len1 !== len2) {
            return len1 > len2 ? 1 : -1;
        }
        for (let i = 0; i < len1; i++) {
            const childIndex = len1 - 1 - i;
            stack.push([getChild(e1, childIndex), getChild(e2, childIndex)]);
        }
    }
    return 0;
}

/**
 * Compare `expr` with `sub`, where `sub` is in the subtree of `expr`. The process is similar
 * @param {TracedExpressionWithIndex} expr
 * @param {TracedExpressionWithIndex} sub
 */
export function findNestingFrom(expr, sub) {
    /** @type {TracedExpressionWithIndex | null} */
    let ret = null;
    /** @type {[TracedExpressionWithIndex, TracedExpressionWithIndex][]} */
    const stack = [[expr, sub]];
    while (stack.length > 0) {
        /** @type {typeof stack[0]} */
        // @ts-ignore
        const [e1, e2] = stack.pop();
        if (e1.data === sub.data) {
            ret = e2;
            continue;
        }
        if (typeof e1.data === 'number') {
            if (typeof e2.data === 'number') {
                if (e1.data !== e2.data) {
                    return null;
                } else continue;
            } else return null;
        }
        if (typeof e2.data === 'number') {
            return null;
        }
        if (compareHead(e1.data, e2.data) !== 0) {
            return null;
        }
        const len1 = childrenCount(e1.data);
        if (childrenCount(e2.data) !== len1) {
            return null;
        }
        for (let i = 0; i < len1; i++) {
            const childIndex = len1 - 1 - i;
            stack.push([{data: getChild(e1.data, childIndex), prev: e1, childIndex}, {data: getChild(e2.data, childIndex), prev: e2, childIndex}]);
        }
    }
    return ret;
}

/**
 * @param {TracedExpressionWithIndex} expr
 * @param {TracedExpressionWithIndex} sub
 * @returns {TracedExpressionWithIndex[] | null}
 */
export function findMultipleNestingFrom(expr, sub) {
    let lastArg = findNestingFrom(expr, sub);
    if (lastArg !== null) {
        /** @type {TracedExpressionWithIndex[]} */
        const ret = [sub];
        while (lastArg !== null) {
            ret.push(lastArg);
            lastArg = findNestingFrom(ret[ret.length - 2], lastArg);
        }
        return ret;
    } else return null;
}

/**
 * @param {Expression} expr
 */
export function findSlotLabels(expr) {
    /** @type {Expression[]} */
    const todo = [expr];
    /** @type {number[]} */
    const ret = [];
    while (todo.length > 0) {
        /** @type {typeof expr} */
        // @ts-ignore
        const top = todo.pop();
        if (typeof top === 'object') {
            if (top.type === 'slot') {
                ret.push(top.id);
            } else {
                const len = childrenCount(top);
                for (let i = 0; i < len; i++) {
                    todo.push(getChild(top, len - 1 - i));
                }
            }
        }
    }
    return ret;
}

/**
 * @param {TracedExpressionWithIndex} expr
 * @returns {TracedExpressionWithIndex[] | null}
 */
export function findNesting(expr) {
    /** @type {TracedExpressionWithIndex[]} */
    const queue = [];
    if (typeof expr.data === 'object') {
        for (let len = childrenCount(expr.data), i = 0; i < len; i++) {
            queue.push({prev: expr, data: getChild(expr.data, i), childIndex: i});
        }
    }
    while (queue.length > 0) {
        /** @type {typeof queue[0]} */
        // @ts-ignore
        const top = queue.shift();
        const nestedEnd = findMultipleNestingFrom(expr, top);
        if (nestedEnd !== null) {
            return nestedEnd;
        }
        if (typeof top.data === 'object') {
            for (let len = childrenCount(top.data), i = 0; i < len; i++) {
                queue.push({prev: top, data: getChild(top.data, i), childIndex: i});
            }
        }
    }
    return null;
}

/**
 * @param {number[]} labels
 */
function firstNonOccupiedLabel(labels) {
    /** @type {boolean[]} */
    const set = [];
    for (const l of labels) {
        set[l] = true;
    }
    for (let i = 0; i < set.length; i++) {
        if (!set[i]) {
            return i;
        }
    }
    return set.length;
}

/**
 * @param {TracedExpressionWithIndex} expr
 * @param {Expression} child
 */
function replaceChildAll(expr, child) {
    expr.data = child;
    while (expr.prev !== null) {
        const prev = expr.prev;
        if (typeof prev.data === 'object') {
            /** @type {Expression[]} */
            const children = [];
            for (let j = 0, len = childrenCount(prev.data); j < len; j++) {
                children.push(j === expr.childIndex ? child : getChild(prev.data, j));
            }
            child = prev.data = withChildren(prev.data, children);
        }
        expr = prev;
    }
    return expr;
}

/**
 * @param {Expression} expr
 */
export function foldAllNestings(expr) {
    /** @type {TracedExpressionWithIndex} */
    let root = {prev: null, data: expr};
    /** @type {TracedExpressionWithIndex[]} */
    const todo = [root];
    while (todo.length > 0) {
        /** @type {typeof todo[0]} */
        // @ts-ignore
        const top = todo.pop();
        const nesting = findNesting(top);
        if (nesting !== null) {
            const e1 = nesting[0];
            const e2 = nesting[nesting.length - 1];
            const slotId = firstNonOccupiedLabel(findSlotLabels(top.data));
            root = replaceChildAll(e1, {type: 'slot', id: slotId});
            const body = top.data;
            root = replaceChildAll(top, {type: 'lambda', args: [slotId], body, iterations: nesting.length, appliedTo: e2.data});
            todo.push({prev: top, data: body, childIndex: 0}, {prev: top, data: e2.data, childIndex: 2});
        } else if (typeof top.data === 'object') {
            const len = childrenCount(top.data);
            for (let i = 0; i < len; i++) {
                const childIndex = len - 1 - i;
                todo.push({prev: top, childIndex, data: getChild(top.data, childIndex)});
            }
        }
    }
    return root.data;
}

/**
 * @param {Expression} expr
 * @param {(string | Expression)[]} arr
 */
function stringifyOne(expr, arr) {
    if (typeof expr === 'number') {
        arr.push(expr.toString());
    } else switch (expr.type) {
        case 'plus':
            for (let i = 0, a = expr.subexpressions; i < a.length; i++) {
                if (i > 0) {
                    arr.push('+');
                }
                arr.push(a[i]);
            }
            break;
        case 'times':
            for (const e of expr.subexpressions) {
                if (typeof e === 'object' && e.type === 'plus') {
                    arr.push('(', e, ')');
                } else arr.push(e);
            }
            break;
        case 'power': {
            const {base, power} = expr;
            if (typeof base === 'object' && (base.type === 'plus' || base.type === 'times')) {
                arr.push('(', base, ')');
            } else arr.push(base);
            arr.push('^');
            if (typeof power === 'object' && (power.type === 'plus' || power.type === 'times')) {
                arr.push('(', power, ')');
            } else arr.push(power);
            break;
        }
        case 'omega': arr.push('omega'); break;
        case 'lambda': {
            let head = 'Lambda[{';
            for (let i = 0, a = expr.args; i < a.length; i++) {
                if (i > 0) {
                    head += ',';
                }
                head += '#' + a[i];
            }
            head += '},';
            /** @type {(string | Expression)[]} */
            arr.push(head, expr.body, ',', expr.iterations);
            if (expr.appliedTo !== void 0) {
                arr.push(',', expr.appliedTo);
            }
            arr.push(']');
            break;
        }
        case 'slot': arr.push('#' + expr.id); break;
        default: unreachable();
    }
}

/**
 * @param {Expression} ord
 */
export function stringify(ord) {
    /** @type {(Expression | string)[]} */
    const queue = [ord];
    while (!(queue.length === 1 && typeof queue[0] === 'string')) {
        /** @type {(Expression | string)[]} */
        const newQueue = [];
        for (const elem of queue) {
            if (typeof elem === 'string') {
                newQueue.push(elem);
            } else if (typeof elem === 'number') {
                newQueue.push(elem.toString());
            } else {
                stringifyOne(elem, newQueue);
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
                    accumulator = '';
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
 * @param {Expression} ord
 * @returns {Expression}
 */
export function successor(ord) {
    if (typeof ord === 'number') return ord + 1;
    if (typeof ord === 'object' && ord.type === 'plus') {
        const last = ord.subexpressions[ord.subexpressions.length - 1];
        if (typeof last === 'number') {
            return {type: 'plus', subexpressions: replacePart(ord.subexpressions, -1, last + 1)};
        } else {
            return {type: 'plus', subexpressions: ord.subexpressions.concat([1])};
        }
    }
    return {type: 'plus', subexpressions: [ord, 1]};
}

/**
 * Find the smallest limit ordinal a such that a[n] <= ord < a.
 * @param {Expression} ordinal Ordinal to upgrade
 * @param {number} n
 * @param {MaximizerOptions} opt
 */
export function maximizeOne(ordinal, n, opt) {
    /** @type {Expression | null} */
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
 * @param {Expression} ordinal Ordinal to upgrade
 * @param {(ret: Expression | null) => void} cb
 * @param {(run: MaximizerExecutor) => void} exec
 */
export function maximizeOneAsync(ordinal, cb, exec) {
    exec((n, opt) => {
        if (typeof ordinal === 'number') {
            exec(() => cb(ordinal >= n ? OMEGA : null));
            return;
        } else switch (ordinal.type) {
            case 'plus': maximizePlusOrTimes(ordinal.subexpressions, 'plus', cb, exec); break;
            case 'times': maximizePlusOrTimes(ordinal.subexpressions, 'times', cb, exec); break;
            case 'power':
                maximizeOneAsync(ordinal.power, power => {
                    const ret = power !== null ? evaluatePower(ordinal.base, power) : null;
                    exec(() => cb(ret));
                }, exec); break;
            default: exec(() => cb(null));
        }
    });
}

/**
 * @param {Expression[]} ords Ordinal to upgrade
 * @param {'plus' | 'times'} mode
 * @param {(ret: Expression | null) => void} cb
 * @param {(run: MaximizerExecutor) => void} exec
 */
function maximizePlusOrTimes(ords, mode, cb, exec) {
    let i = 0;
    /** @type {(n: Expression[]) => Expression} */
    const cont = mode === 'plus' ? evaluatePlus : evaluateTimes;
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
 * @param {Expression} ordinal1
 * @param {Expression} ordinal2
 */
export function compare(ordinal1, ordinal2) {
    /** @type {Ordering} */
    let ret = 0;
    const evaluator = new Evaluator();
    compareAsync(ordinal1, ordinal2, ret2 => { ret = ret2 }, evaluator);
    evaluator.run();
    return ret;
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
 * @param {CompoundExpression} expr1
 * @param {CompoundExpression} expr2
 * @param {(ret: Ordering, e: Evaluator) => void} cb
 * @param {Evaluator} evaluator
 */
function compareAsyncOne(expr1, expr2, cb, evaluator) {
    switch (expr1.type) {
        case 'omega':
            evaluator.setReturn(expr2.type === 'omega' ? 0 : -1, cb);
            return;
        case 'plus':
            lexicographicalCompare(expr1.subexpressions, expr2.type === 'plus' ? expr2.subexpressions : [expr2], 0, cb, evaluator);
            return;
        case 'times':
            lexicographicalCompare(expr1.subexpressions, expr2.type === 'times' ? expr2.subexpressions : [expr2], 1, cb, evaluator);
            return;
        case 'power':
            lexicographicalCompare([expr1.base, expr1.power], expr2.type === 'power' ? [expr2.base, expr2.power] : [expr2, 1], 1, cb, evaluator);
            return;
    }
    throw new Error(`cannot compare ${stringify(expr1)} and ${stringify(expr2)}`);
}

/**
 * @param {Expression} ord1
 * @param {Expression} ord2
 * @param {(ret: Ordering, e: Evaluator) => void} cb
 * @param {Evaluator} evaluator
 */
export function compareAsync(ord1, ord2, cb, evaluator) {
    if (typeof ord1 === 'number') {
        if (typeof ord2 === 'number') {
            evaluator.setReturn(ord1 > ord2 ? 1 : ord1 === ord2 ? 0 : -1, cb);
        } else {
            evaluator.setReturn(-1, cb);
        }
        return;
    }
    if (typeof ord2 === 'number') {
        evaluator.setReturn(1, cb);
        return;
    }
    if (BASIC_TYPE_ORDERS.indexOf(ord1.type) > BASIC_TYPE_ORDERS.indexOf(ord2.type)) {
        compareAsyncOne(ord2, ord1, (ret, e) => e.setReturn(reverseOrdering(ret), cb), evaluator);
        return;
    }
    compareAsyncOne(ord1, ord2, cb, evaluator);
}

/**
 * @param {Expression[]} ords1
 * @param {Expression[]} ords2
 * @param {Expression} padding
 * @param {(ret: Ordering, e: Evaluator) => void} cb
 * @param {Evaluator} evaluator
 */
function lexicographicalCompare(ords1, ords2, padding, cb, evaluator) {
    let i = 0;
    /**
     * @param {Evaluator} evaluator
     */
    function cmp(evaluator) {
        if (i < ords1.length || i < ords2.length) {
            compareAsync(i < ords1.length ? ords1[i] : padding, i < ords2.length ? ords2[i] : padding, ret => {
                if (ret === 0) {
                    i++;
                    evaluator.exec(cmp);
                } else {
                    evaluator.setReturn(ret, cb);
                }
            }, evaluator);
        } else {
            evaluator.setReturn(0, cb);
        }
    }
    evaluator.exec(cmp);
}

/**
 * @param {Expression} expr
 * @param {number} slotId
 */
export function foundamentalSequenceFunction(expr, slotId) {
    /** @type {((expr: Expression) => Expression)[]} */
    const todo = [];
    out: while (true) {
        if (typeof expr === 'number') {
            throw new Error('number is not limit ordinal');
        } else switch (expr.type) {
            case 'omega': expr = {type: 'slot', id: slotId}; break out;
            case 'plus': {
                const subs = expr.subexpressions;
                todo.push(expr2 => evaluatePlus(replacePart(subs, -1, expr2)));
                expr = subs[subs.length - 1];
                break;
            }
            case 'times': {
                const subs = expr.subexpressions;
                const last = subs[subs.length - 1];
                if (typeof last === 'number') {
                    todo.push(expr2 => evaluatePlus([
                        evaluateTimes(replacePart(subs, -1, last - 1)),
                        expr2
                    ]));
                    expr = subs.length > 1 ? {type: 'times', subexpressions: subs.slice(0, -1)} : subs[0];
                } else {
                    todo.push(expr2 => evaluateTimes(replacePart(subs, -1, expr2)));
                    expr = last;
                }
                break;
            }
            case 'power': {
                const {base, power} = expr;
                const power2 = separateSuccessor(power);
                if (power2 !== null) {
                    todo.push(expr2 => evaluateTimes([evaluatePower(base, power2), expr2]));
                    expr = base;
                } else {
                    todo.push(expr2 => evaluatePower(base, expr2));
                    expr = power;
                }
                break;
            }
            default: unreachable();
        }
    }
    for (let i = 0; i < todo.length; i++) {
        expr = todo[todo.length - 1 - i](expr);
    }
    return expr;
}

/**
 * @param {Expression} expr
 * @param {number} n
 */
export function foundamentalSequence(expr, n) {
    const slotId = firstNonOccupiedLabel(findSlotLabels(expr));
    const expr2 = foundamentalSequenceFunction(expr, slotId);
    return mapAll(expr2, e => {
        if (typeof e === 'object') {
            if (e.type === 'slot' && e.id === slotId) {
                return n;
            } else if (e.type === 'lambda' && e.appliedTo !== void 0 && typeof e.iterations === 'number') {
                return expandNesting(e.body, e.args[0], e.iterations, e.appliedTo);
            }
        }
        return e;
    });
}

/**
 * @param {Expression} expr
 * @param {number} slotId
 * @param {number} iters
 * @param {Expression} arg
 */
export function expandNesting(expr, slotId, iters, arg) {
    while (iters --> 0) {
        arg = mapAll(expr, e => typeof e === 'object' && e.type === 'slot' && e.id === slotId ? arg : e);
    }
    return arg;
}

/**
 * @param {Expression} expr
 * @param {(e: Expression) => Expression} mapper
 * @param {(e: Expression) => boolean} [recursePredicate]
 */
export function mapAll(expr, mapper, recursePredicate) {
    /** @type {(Expression | {type: 'poped', oldExpr: Expression})[]} */
    const todo = [expr];
    /** @type {Expression[]} */
    const stack = [];
    while (todo.length > 0) {
        /** @type {typeof todo[0]} */
        // @ts-ignore
        const top = todo.pop();
        if (typeof top === 'number') {
            stack.push(mapper(top));
        } else if (top.type !== 'poped') {
            const len = childrenCount(top);
            if (len === 0) {
                stack.push(mapper(top));
            } else if (recursePredicate === void 0 || recursePredicate(top)) {
                todo.push({type: 'poped', oldExpr: top});
                for (let i = 0; i < len; i++) {
                    todo.push(getChild(top, len - 1 - i));
                }
            }
        } else {
            const oldExpr = top.oldExpr;
            const len = childrenCount(oldExpr);
            /** @type {Expression[]} */
            const newChildren = [];
            let childChanged = false;
            for (let i = 0; i < len; i++) {
                const c = stack[stack.length - len + i];
                if (c !== getChild(oldExpr, i)) {
                    childChanged = true;
                }
                newChildren.push(c);
            }
            stack.push(mapper(childChanged ? evaluate(withChildren(oldExpr, newChildren)) : oldExpr));
        }
    }
    return stack[0];
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
 * @param {Expression} ord
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
