/** @import { VeblenFunction, MaximizerOptions, NestedArrayExpression, Ordering, MaximizerExecutor, NestedArrayTerm, NestedArrayCoord, Expression, CompoundExpression, DisplayNotation, DisplayOptions, TracedExpression, EvaluatorCallback, TracedExpressionWithIndex } from './types.js' */

const CHAR_LOWER_OMEGA = '\u03C9';
const CHAR_LOWER_ALPHA = '\u03B1';

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
    } else if (ord instanceof Plus) {
        const last = ord.subexpressions[ord.subexpressions.length - 1];
        if (last === 1) {
            if (ord.subexpressions.length === 2) {
                return ord.subexpressions[0];
            } else {
                return new Plus(ord.subexpressions.slice(0, -1));
            }
        } else if (typeof last === 'number') {
            return new Plus(replacePart(ord.subexpressions, -1, last - 1));
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
 * @param {Expression} ord
 * @returns {[Expression, Expression]}
 */
function separatePower(ord) {
    if (ord instanceof Power) {
        return [ord.base, ord.power];
    } else {
        return [ord, 1];
    }
}

export const BASIC_TYPE_ORDERS = [
    "Symbol",
    "Plus",
    "Times",
    "Power"
];

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
}

/** @implements {CompoundExpression} */
export class Omega {
    /**
     * @param {number} n
     * @param {((ord: Expression) => Expression)[]} stack
     * @returns {[Expression, boolean]}
     */
    foundamentalSequenceStep(n, stack) {
        return [n, true];
    }
    /**
     * @param {CompoundExpression} other
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
     * @param {(ret: Expression | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        exec((n, opt) => null);
    }
    stringifyOne() {
        return ['omega'];
    }
    getType() { return "Omega"; }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     * @returns {Ordering}
     */
    compareHead(parent, other) {
        if (other.data instanceof Omega) {
            return 0;
        } else return 1;
    }
    /**
     * @param {(Expression | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayNotation[][]} stack
     * @param {DisplayOptions} opt
     */
    toDisplayNotationOne(todo, stack, opt) {
        stack.push([{type: 'mi', value: CHAR_LOWER_OMEGA}]);
    }
    evaluate2() {
        return false;
    }
    /**
     * @param {TracedExpression} head
     * @param {number} childIndex
     * @param {EvaluatorCallback} cb
     * @param {Evaluator} evaluator
     */
    evaluateUpValue(head, childIndex, cb, evaluator) {
        if (head instanceof FoundamentalSequence && childIndex === 1) {
            evaluator.setReturn(head.subscript, cb);
            return true;
        }
        return false;
    }
    getLength() {
        return 0;
    }
    withChildren() {
        return this;
    }
    handleMessage() {

    }
    /**
     * @returns {Expression}
     */
    getChild() { throw new Error('No child'); }
}

export const OMEGA = new Omega();

/** @implements {CompoundExpression} */
export class Plus {
    /**
     * @param {Expression[]} subexpressions
     */
    constructor(subexpressions) {
        this.subexpressions = subexpressions;
    }
    stringifyOne() {
        /** @type {(Expression | string)[]} */
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
     * @param {(Expression | ((stack: DisplayNotation[][]) => void))[]} todo
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
     * @param {((ord: Expression) => Expression)[]} stack
     * @returns {[Expression, boolean]}
     */
    foundamentalSequenceStep(n, stack) {
        stack.push(ord => new Plus(replacePart(this.subexpressions, -1, ord)).evaluate());
        return [this.subexpressions[this.subexpressions.length - 1], false];
    }
    /**
     * @param {CompoundExpression} other
     * @param {(ret: Ordering) => void} cb
     * @param {(run: () => void) => void} exec
     */
    compareAsync(other, cb, exec) {
        lexicographicalCompare(this.subexpressions, other instanceof Plus ? other.subexpressions : [other], 0, cb, exec);
    }
    /**
     * @param {(ret: Expression | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        maximizePlusOrTimes(this.subexpressions, 'plus', cb, exec);
    }
    getType() { return "Plus"; }
    /**
     * @param {Expression[]} children
     */
    withChildren(children) {
        return new Plus(children);
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     * @returns {Ordering}
     */
    compareHead(parent, other) {
        if (other.data instanceof Plus) {
            return 0;
        } else return 1;
    }
    // evaluate() {
    //     /** @type {Expression[]} */
    //     const flattened = [];
    //     for (const arg of this.subexpressions) {
    //         if (arg instanceof Plus) {
    //             for (const arg2 of arg.subexpressions) {
    //                 flattened.push(arg2);
    //             }
    //         } else {
    //             flattened.push(arg);
    //         }
    //     }
    //     const args = flattened.filter(a => a !== 0);
    //     if (args.length === 0) {
    //         return 0;
    //     } else if (args.length === 1) {
    //         return args[0];
    //     } else {
    //         /** @type {Expression[]} */
    //         const args2 = [];
    //         let [accumulator, coef] = separateConstCoef(args[0]);
    //         for (let i = 1; i < args.length; i++) {
    //             let [factor, coef2] = separateConstCoef(args[i]);
    //             if (compareExpression(factor, accumulator) === 0) {
    //                 coef += coef2;
    //             } else {
    //                 if (coef > 1) {
    //                     args2.push(new Times([accumulator, coef]).evaluate());
    //                 } else {
    //                     args2.push(accumulator);
    //                 }
    //                 accumulator = factor;
    //                 coef = coef2;
    //             }
    //         }
    //         if (coef > 1) {
    //             args2.push(new Times([accumulator, coef]).evaluate());
    //         } else {
    //             args2.push(accumulator);
    //         }
    //         return args2.length > 1 ? new Plus(args2) : args2[0];
    //     }
    // }
    /**
     * @param {TracedExpression | null} parent
     * @param {Expression[]} args
     * @param {(ret: Expression, e: Evaluator) => void} cb
     * @param {Evaluator} evaluator
     */
    static collectFactors(parent, args, cb, evaluator) {
        /** @type {Expression[]} */
        const args2 = [];
        let [accumulator, coef] = separateConstCoef(args[0]);
        let i = 1;
        /**
         * @param {(e: Evaluator) => void} cb
         */
        function commitFactors(cb) {
            if (coef > 1) {
                evaluateAsync(new Times([accumulator, coef]), parent, ret => {
                    args2.push(ret);
                    evaluator.exec(cb);
                }, evaluator);
            } else {
                args2.push(accumulator);
                evaluator.exec(cb);
            }
        }
        /**
         * @param {Evaluator} evaluator
         */
        function doIt(evaluator) {
            if (i < args.length) {
                let [factor, coef2] = separateConstCoef(args[i]);
                i++;
                if (compareExpression({data: factor, prev: parent}, {data: accumulator, prev: parent}) === 0) {
                    coef += coef2;
                } else {
                    commitFactors(evaluator => evaluator.exec(doIt));
                }
            } else {
                commitFactors(evaluator => {
                    evaluator.setReturn(args2.length > 1 ? new Plus(args2) : args2[0], cb);
                });
            }
        }
        evaluator.exec(doIt);
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {(ret: Expression, e: Evaluator) => void} cb
     * @param {Evaluator} evaluator
     */
    evaluate2(parent, cb, evaluator) {
        /** @type {Expression[]} */
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
            evaluator.setReturn(0, cb);
        } else if (args.length === 1) {
            evaluator.setReturn(args[0], cb);
        } else {
            Plus.collectFactors(parent, args, cb, evaluator);
        }
        return true;
    }
    evaluateUpValue() {
        return false;
    }
    getLength() {
        return this.subexpressions.length;
    }
    /**
     * @param {number} i
     */
    getChild(i) { return this.subexpressions[i]; }
}

/** @implements {CompoundExpression} */
export class Times {
    /**
     * @param {Expression[]} subexpressions
     */
    constructor(subexpressions) {
        /** @type {Expression[]} @readonly */
        this.subexpressions = subexpressions;
    }
    /**
     * @param {number} n
     * @param {((ord: Expression) => Expression)[]} stack
     * @returns {[Expression, boolean]}
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
     * @param {CompoundExpression} other
     * @param {(ret: Ordering) => void} cb
     * @param {(run: () => void) => void} exec
     */
    compareAsync(other, cb, exec) {
        lexicographicalCompare(this.subexpressions, other instanceof Times ? other.subexpressions : [other], 1, cb, exec);
    }
    /**
     * @param {(ret: Expression | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        maximizePlusOrTimes(this.subexpressions, 'times', cb, exec);
    }
    stringifyOne() {
        /** @type {(Expression | string)[]} */
        const ret = [];
        for (let i = 0, a = this.subexpressions; i < a.length; i++) {
            ret.push(a[i]);
        }
        return ret;
    }
    /**
     * @param {Expression[]} children
     */
    withChildren(children) {
        return new Times(children);
    }
    /**
     * @param {(Expression | ((stack: DisplayNotation[][]) => void))[]} todo
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
    getType() { return "Times"; }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     * @returns {Ordering}
     */
    compareHead(parent, other) {
        if (other.data instanceof Times) {
            return 0;
        } else return 1;
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
            /** @type {Expression[]} */
            const args2 = [];
            let [accumulator, pow] = separatePower(args[0]);
            for (let i = 1; i < args.length; i++) {
                let [base2, pow2] = separatePower(args[i]);
                if (compareExpression(accumulator, base2) === 0) {
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
    /**
     * @param {TracedExpression | null} parent
     * @param {Expression[]} args
     * @param {(ret: Expression, e: Evaluator) => void} cb
     * @param {Evaluator} evaluator
     */
    static collectPowers(parent, args, cb, evaluator) {
        /** @type {Expression[]} */
        const args2 = [];
        /** @type {Expression[]} */
        const powAccumulator = [];
        let [base1, pow] = separatePower(args[0]);
        powAccumulator.push(pow);
        let i = 1;
        /**
         * @param {(e: Evaluator) => void} cb
         */
        function commitPow(cb) {
            if (powAccumulator.length > 1) {
                evaluateAsync(new Plus(powAccumulator), parent, (ret, evaluator) => evaluateAsync(new Power(base1, ret), parent, ret => {
                    args2.push(ret);
                    powAccumulator.length = 0;
                    evaluator.exec(cb);
                }, evaluator), evaluator);
            } else {
                args2.push(new Power(base1, powAccumulator[0]));
                powAccumulator.length = 0;
                evaluator.exec(cb);
            }
        }
        /**
         * @param {Evaluator} evaluator
         */
        function doIt(evaluator) {
            if (i < args.length) {
                let [base2, pow2] = separatePower(args[i]);
                if (compareExpression({data: base1, prev: parent}, {data: base2, prev: parent}) === 0) {
                    powAccumulator.push(pow2);
                    i++;
                    evaluator.exec(doIt);
                } else {
                    commitPow(evaluator => {
                        i++;
                        base1 = base2;
                        powAccumulator.push(pow2);
                        doIt(evaluator);
                    });
                }
            } else {
                commitPow(evaluator => evaluator.setReturn(args2.length === 1 ? args2[0] : new Times(args2), cb));
            }
        }
        evaluator.exec(doIt);
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {EvaluatorCallback} cb
     * @param {Evaluator} evaluator
     */
    evaluate2(parent, cb, evaluator) {
        if (this.subexpressions.some(o => o === 0)) {
            evaluator.setReturn(0, cb);
            return true;
        }
        const args = this.subexpressions.filter(a => a !== 1);
        if (args.length === 0) {
            evaluator.setReturn(1, cb);
        } else if (args.length === 1) {
            evaluator.setReturn(args[0], cb);
        } else {
            Times.collectPowers(parent, args, cb, evaluator);
        }
        return true;
    }
    evaluateUpValue() {
        return false;
    }
    getLength() {
        return this.subexpressions.length;
    }
    /**
     * @param {number} i
     */
    getChild(i) { return this.subexpressions[i]; }
    /**
     * @param {number} i
     * @param {Expression} child
     */
    setChild(i, child) {
        this.subexpressions[i] = child;
    }
    /**
     * @param {Expression} child
     */
    appendChild(child) {
        this.subexpressions.push(child);
    }
}

/** @implements {CompoundExpression} */
export class Power {
    /**
     * @param {Expression} base
     * @param {Expression} power
     */
    constructor(base, power) {
        /** @readonly @type {Expression} */
        this.base = base;
        /** @readonly @type {Expression} */
        this.power = power;
    }
    /**
     * @param {number} n
     * @param {((ord: Expression) => Expression)[]} stack
     * @returns {[Expression, boolean]}
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
     * @param {CompoundExpression} other
     * @param {(ret: Ordering) => void} cb
     * @param {(run: () => void) => void} exec
     */
    compareAsync(other, cb, exec) {
        lexicographicalCompare([this.base, this.power], other instanceof Power ? [other.base, other.power] : [other, 1], 1, cb, exec);
    }
    /**
     * @param {(ret: Expression | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        maximizeOneAsync(this.power, ret => {
            exec(() => cb(ret === null ? null : new Power(this.base, ret).evaluate()));
        }, exec);
    }
    stringifyOne() {
        /** @type {(string | Expression)[]} */
        const ret = [];
        if (this.base instanceof Plus || this.base instanceof Times) {
            ret.push('(', this.base, ')');
        } else {
            ret.push(this.base);
        }
        ret.push('^');
        if (this.power instanceof Plus || this.power instanceof Times) {
            ret.push('(', this.power, ')');
        } else {
            ret.push(this.power);
        }
        return ret;
    }
    /**
     * @param {Expression[]} children
     */
    withChildren(children) {
        return new Power(children[0], children[1]);
    }
    /**
     * @param {(Expression | ((stack: DisplayNotation[][]) => void))[]} todo
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
    getType() { return "Power"; }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     * @returns {Ordering}
     */
    compareHead(parent, other) {
        if (other.data instanceof Power) {
            return 0;
        } else return 1;
    }
    evaluate() {
        if (this.power === 0) {
            return 1;
        } else if (this.power === 1) {
            return this.base;
        } else return this;
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {EvaluatorCallback} cb
     * @param {Evaluator} evaluator
     */
    evaluate2(parent, cb, evaluator) {
        if (this.power === 0) {
            evaluator.setReturn(1, cb);
            return true;
        } else if (this.power === 1) {
            evaluator.setReturn(this.base, cb);
            return true;
        } else return false;
    }
    evaluateUpValue() {
        return false;
    }
    getLength() {
        return 2;
    }
    /**
     * @param {number} i
     */
    getChild(i) {
        switch (i) {
            case 0: return this.base;
            case 1: return this.power;
            default: throw new Error(`out of bounds: ${i}`);
        }
    }
}

/** @implements {CompoundExpression} */
export class Symbol {
    static DEFAULT_NS = "minecraft";
    /**
     * @param {string} name
     * @param {string=} namespace
     * @param {DisplayNotation=} displayName
     */
    constructor(name, namespace, displayName) {
        /** @type {string} */
        this.name = name;
        /** @type {string} */
        this.namespace = namespace ?? Symbol.DEFAULT_NS;
        /** @type {DisplayNotation} */
        this.displayName = displayName ?? {type: 'mi', value: this.name};
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {EvaluatorCallback} cb
     * @param {Evaluator} evaluator
     */
    evaluate2(parent, cb, evaluator) {
        evaluator.setReturn(this, cb);
    }
    stringifyOne() {
        return [this.name];
    }
    withChildren() {
        return this;
    }
    /**
     * @param {(Expression | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayOptions} opt
     * @param {DisplayNotation[][]} stack
     */
    toDisplayNotationOne(todo, stack, opt) {
        stack.push([this.displayName]);
    }
    getType() { return "Symbol"; }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     * @returns {Ordering}
     */
    compareHead(parent, other) {
        const other2 = other.data;
        if (other2 instanceof Symbol) {
            return this.name > other2.name ? 1 : this.name === other2.name ? 0 : -1;
        } else return 1;
    }
    evaluate() {
        return false;
    }
    evaluateUpValue() {
        return false;
    }
    getLength() { return 0; }
    /** @returns {Expression} */
    getChild() {
        throw new Error('No child');
    }
    /**
     * @param {number} n
     * @param {((ord: Expression) => Expression)[]} stack
     * @returns {[Expression, boolean]}
     */
    foundamentalSequenceStep(n, stack) {
        return [new FoundamentalSequence(this, n), true];
    }
    /**
     * @param {CompoundExpression} other
     * @param {{ (ret: Ordering): void; (ret: Ordering): void; }} cb
     * @param {{ (run: () => void): void; (run: () => void): void; }} exec
     */
    compareAsync(other, cb, exec) {
        throw new Error('Method not implemented.');
    }
    /**
     * @param {(ret: Expression | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        throw new Error('Method not implemented.');
    }

}

/** @implements {CompoundExpression} */
export class FoundamentalSequence {
    /**
     * @param {Expression} expr
     * @param {Expression} subscript
     */
    constructor(expr, subscript) {
        /** @type {Expression} */
        this.expr = expr;
        /** @type {Expression} */
        this.subscript = subscript;
    }
    stringifyOne() {
        return [this.expr, '[', this.subscript, ']'];
    }
    /**
     * @param {(Expression | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayOptions} opt
     * @param {DisplayNotation[][]} stack
     */
    toDisplayNotationOne(todo, stack, opt) {
        todo.push(stack => {
            const subscript = stack[stack.length - 1];
            const expr = stack[stack.length - 2];
            stack.length -= 2;
            stack.push([...expr, {type: 'mo', value: '['}, ...subscript, {type: 'mo', value: ']'}]);
        }, this.subscript, this.expr);
    }
    getType() { return "FoundamentalSequence"; }
    shallowCopy() {
        return new FoundamentalSequence(this.expr, this.subscript);
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     * @returns {Ordering}
     */
    compareHead(parent, other) {
        if (other.data instanceof FoundamentalSequence) {
            return 0;
        } else return 1;
    }
    evaluate2() {
        return false;
    }
    evaluateUpValue() {
        return false;
    }
    getLength() {
        return 0;
    }
    /**
     * @param {number} i
     * @returns {Expression}
     */
    getChild(i) {
        switch (i) {
            case 0: return this.expr;
            case 1: return this.subscript;
            default: throw new Error(`index ${i} is out of bounds`);
        }
    }
    /**
     * @param {number} i
     * @param {Expression} expr
     */
    setChild(i, expr) {
        switch (i) {
            case 0: this.expr = expr;
            case 1: this.subscript = expr;
        }
    }
    appendChild() {}
    /**
     * @param {number} n
     * @param {((ord: Expression) => Expression)[]} stack
     * @returns {[Expression, boolean]}
     */
    foundamentalSequenceStep(n, stack) {
        return [this, false];
    }
    /**
     * @param {CompoundExpression} other
     * @param {{ (ret: Ordering): void; (ret: Ordering): void; }} cb
     * @param {{ (run: () => void): void; (run: () => void): void; }} exec
     */
    compareAsync(other, cb, exec) {
        throw new Error('Method not implemented.');
    }
    /**
     * @param {(ret: Expression | null) => void} cb
     * @param {(run: MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        throw new Error('Method not implemented.');
    }
}

/** @implements {CompoundExpression} */
export class OrdinalOrder {
    /**
     * @param {Expression} lhs
     * @param {Expression} rhs
     * @param {boolean} [inversed]
     */
    constructor(lhs, rhs, inversed) {
        /** @type {Expression} */
        this.lhs = lhs;
        /** @type {Expression} */
        this.rhs = rhs;
        /** @type {boolean} */
        this.inversed = inversed ?? false;
    }
    stringifyOne() {
        return ['OrdinalOrder[', this.lhs, ',', this.rhs, ',', this.inversed ? 'true' : 'false', ']'];
    }
    getType() {
        return 'OrdinalOrder';
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     */
    compareHead(parent, other) {
        if (other.data instanceof OrdinalOrder) {
            return 0;
        } else return 1;
    }
    toDisplayNotationOne(todo, stack, opt) {
        throw new Error('Method not implemented.');
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {EvaluatorCallback} cb
     * @param {Evaluator} evaluator
     */
    evaluate2(parent, cb, evaluator) {
        if (typeof this.lhs === 'number') {
            if (typeof this.rhs === 'number') {
                evaluator.setReturn(this.lhs > this.rhs ? 1 : this.lhs === this.rhs ? 0 : -1, cb);
                return true;
            }
        }
    }
    evaluateUpValue() {
        return false;
    }
    getLength() {
        return 2;
    }
    /**
     * @param {number} i
     */
    getChild(i) {
        switch (i) {
            case 0: return this.lhs;
            case 1: return this.rhs;
            default: throw new Error();
        }
    }
    foundamentalSequenceStep(n, stack) {
        throw new Error('Method not implemented.');
    }
    compareAsync(other, cb, exec) {
        throw new Error('Method not implemented.');
    }
    maximizeAsync(cb, exec) {
        throw new Error('Method not implemented.');
    }
}

/** @implements {CompoundExpression} */
export class LambdaExpression {
    /**
     * @param {number[]} argIds
     * @param {Expression} body
     * @param {Expression} [iterations]
     * @param {Expression | null} [appliedTo]
     */
    constructor(argIds, body, iterations, appliedTo) {
        /** @type {number[]} */
        this.argIds = argIds;
        /** @type {Expression} */
        this.body = body;
        /** @type {Expression} */
        this.iterations = iterations ?? 1;
        /** @type {Expression | null} */
        this.appliedTo = appliedTo ?? null;
    }
    stringifyOne() {
        let head = 'Lambda[{';
        for (let i = 0, a = this.argIds; i < a.length; i++) {
            if (i > 0) {
                head += ',';
            }
            head += '#' + a[i];
        }
        head += '},';
        /** @type {(string | Expression)[]} */
        const ret = [head, this.body, ',', this.iterations];
        if (this.appliedTo !== null) {
            ret.push(',', this.appliedTo);
        }
        ret.push(']');
        return ret;
    }
    getType() {
        return 'LambdaExpression';
    }
    /**
     * @param {Expression[]} children
     */
    withChildren(children) {
        return new LambdaExpression([...this.argIds], children[0], children[1], children[2]);
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     */
    compareHead(parent, other) {
        const od = other.data;
        if (od instanceof LambdaExpression) {
            const len1 = this.argIds.length;
            /** @type {number} */
            const len2 = od.argIds.length;
            if (len1 !== len2) {
                return len1 > len2 ? 1 : -1;
            }
            return 0;
        } else return 1;
    }
    toDisplayNotationOne(todo, stack, opt) {
        throw new Error('Method not implemented.');
    }
    evaluate2(parent, cb, evaluator) {
        return false;
    }
    evaluateUpValue() {
        return false;
    }
    getLength() {
        return this.appliedTo !== null ? 3 : 2;
    }
    /**
     * @param {number} i
     */
    getChild(i) {
        switch (i) {
            case 0: return this.body;
            case 1: return this.iterations;
            case 2: if (this.appliedTo !== null) { return this.appliedTo } else { throw new Error(`index ${i} out of bounds`); };
            default: throw new Error(`index ${i} out of bounds`);
        }
    }
    /** @returns {[Expression, boolean]} */
    foundamentalSequenceStep(n, stack) {
        throw new Error('Method not implemented.');
    }
    compareAsync(other, cb, exec) {
        throw new Error('Method not implemented.');
    }
    maximizeAsync(cb, exec) {
        throw new Error('Method not implemented.');
    }
}

export class OrdinalDispatch {
    constructor(ordinal, zeroBranch, ) {
        this.ordinal
    }
}

/**
 * @param {TracedExpression | null} parent
 * @param {number} id
 * @returns {[number, number] | null}
 */
function findSlotTarget(parent, id) {
    let b = 0;
    while (parent !== null) {
        if (parent instanceof LambdaExpression) {
            const i = parent.argIds.indexOf(id);
            if (i > 0) {
                return [b, i];
            }
        }
        parent = parent.prev;
        b++;
    }
    return null;
}

/** @implements {CompoundExpression} */
export class Slot {
    /**
     * @param {number} id
     */
    constructor(id) {
        this.id = id;
    }
    stringifyOne() {
        return ['#', this.id];
    }
    getType() {
        return 'Slot';
    }
    withChildren() {
        return new Slot(this.id);
    }
    /**
     * @param {TracedExpression | null} parent
     * @param {TracedExpression} other
     * @returns {Ordering}
     */
    compareHead(parent, other) {
        if (other.data instanceof Slot) {
            const pos1 = findSlotTarget(parent, this.id);
            const pos2 = findSlotTarget(other.prev, other.data.id);
            if (pos1 !== null) {
                if (pos2 !== null) {
                    if (pos1[0] !== pos2[0]) {
                        return pos1[0] > pos2[0] ? 1 : -1;
                    } else return pos1[1] > pos2[1] ? 1 : pos1[1] === pos2[1] ? 0 : -1;
                } else return 1;
            }
            if (pos2 !== null) {
                return -1;
            }
            return this.id > other.data.id ? 1 : this.id === other.data.id ? 0 : -1;
        } else return 1;
    }
    /**
     * @param {(Expression | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayNotation[][]} stack
     * @param {DisplayOptions} opt
     */
    toDisplayNotationOne(todo, stack, opt) {
        stack.push([{type: 'subscript', expr: [{type: 'mi', value: CHAR_LOWER_ALPHA}], subscript: [this.id]}]);
    }
    evaluate2() {
        return false;
    }
    evaluateUpValue() {
        return false;
    }
    getLength() {
        return 0;
    }
    /** @returns {Expression} */
    getChild() {
        throw new Error('No child');
    }
    setChild() {}
    appendChild() {}
    /** @returns {[Expression, boolean]} */
    foundamentalSequenceStep(n, stack) {
        throw new Error('Method not implemented.');
    }
    compareAsync(other, cb, exec) {
        throw new Error('Method not implemented.');
    }
    maximizeAsync(cb, exec) {
        throw new Error('Method not implemented.');
    }
}

/**
 * @param {Expression} expr
 * @param {TracedExpression | null} parent
 * @param {EvaluatorCallback} cb
 * @param {Evaluator} evaluator
 */
export function evaluateAsync(expr, parent, cb, evaluator) {
    if (typeof expr === 'number') {
        evaluator.setReturn(expr, cb);
    } else {
        if (!expr.evaluate2(parent, (ret, evaluator) => evaluateUpValueAsync(ret, parent, cb, evaluator), evaluator)) {
            evaluator.setReturn(expr, cb);
            evaluateUpValueAsync(expr, parent, cb, evaluator);
        }
    }
}

/**
 * @param {Expression} expr
 * @param {TracedExpression | null} parent
 * @param {EvaluatorCallback} cb
 * @param {Evaluator} evaluator
 */
function evaluateUpValueAsync(expr, parent, cb, evaluator) {
    if (typeof expr === 'number') {
        evaluator.setReturn(expr, cb);
    } else {
        const len = expr.getLength();
        /** @type {TracedExpression} */
        const parent2 = {prev: parent, data: expr};
        for (let i = 0; i < len; i++) {
            const child = expr.getChild(i);
            if (typeof child === 'object' && child.evaluateUpValue(parent2, i, cb, evaluator)) {
                return;
            }
        }
        evaluator.setReturn(expr, cb);
    }

}

/**
 * Compare two expressions `expr1` and `expr2`. `expr2` may be in the subtree of `expr1`, in which case `0` is returned if `expr2` is encountered in `expr1`.
 * @param {TracedExpression} expr1
 * @param {TracedExpression} expr2
 */
export function compareExpression(expr1, expr2) {
    /** @type {[TracedExpression, TracedExpression][]} */
    const stack = [[expr1, expr2]];
    while (stack.length > 0) {
        /** @type {typeof stack[0]} */
        // @ts-ignore
        const [e1, e2] = stack.pop();
        if (typeof e1.data === 'number') {
            if (typeof e2.data === 'number') {
                if (e1.data > e2.data) {
                    return 1;
                } else if (e1.data < e2.data) {
                    return -1;
                } else continue;
            } else return -1;
        }
        if (typeof e2.data === 'number') {
            return 1;
        }
        if (e1.data === expr2.data) {
            return 0;
        }
        const t1 = e1.data.getType(), t2 = e2.data.getType();
        if (t1 !== t2) {
            const i1 = BASIC_TYPE_ORDERS.indexOf(t1), i2 = BASIC_TYPE_ORDERS.indexOf(t2);
            return i1 > i2 ? 1 : -1;
        } else {
            const cp1 = e1.data.compareHead(e1.prev, e2);
            if (cp1 !== 0) {
                return cp1;
            }
        }
        const len1 = e1.data.getLength(), len2 = e2.data.getLength();
        if (len1 !== len2) {
            return len1 > len2 ? 1 : -1;
        }
        for (let i = 0; i < len1; i++) {
            const childIndex = len1 - 1 - i;
            stack.push([{data: e1.data.getChild(childIndex), prev: e1}, {data: e2.data.getChild(childIndex), prev: e2}]);
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
        if (e1.data.getType() !== e2.data.getType()) {
            return null;
        }
        if (e1.data.compareHead(e1.prev, e2) !== 0) {
            return null;
        }
        const len1 = e1.data.getLength();
        if (e2.data.getLength() !== len1) {
            return null;
        }
        for (let i = 0; i < len1; i++) {
            const childIndex = len1 - 1 - i;
            stack.push([{data: e1.data.getChild(childIndex), prev: e1, childIndex}, {data: e2.data.getChild(childIndex), prev: e2, childIndex}]);
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
        if (top instanceof Slot) {
            ret.push(top.id);
        } else if (typeof top === 'object') {
            const len = top.getLength();
            for (let i = 0; i < len; i++) {
                todo.push(top.getChild(len - 1 - i));
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
        for (let len = expr.data.getLength(), i = 0; i < len; i++) {
            queue.push({prev: expr, data: expr.data.getChild(i), childIndex: i});
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
            for (let len = top.data.getLength(), i = 0; i < len; i++) {
                queue.push({prev: top, data: top.data.getChild(i), childIndex: i});
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
            for (let j = 0, len = prev.data.getLength(); j < len; j++) {
                children.push(j === expr.childIndex ? child : prev.data.getChild(j));
            }
            child = prev.data = prev.data.withChildren(children);
        }
        expr = prev;
    }
    return expr;
}

/**
 * @param {TracedExpressionWithIndex} expr
 */
export function foldAllNestings(expr) {
    /** @type {TracedExpressionWithIndex[]} */
    const todo = [expr];
    while (todo.length > 0) {
        /** @type {typeof todo[0]} */
        // @ts-ignore
        const top = todo.pop();
        const nesting = findNesting(top);
        if (nesting !== null) {
            const e1 = nesting[0];
            const e2 = nesting[nesting.length - 1];
            const slotId = firstNonOccupiedLabel(findSlotLabels(top.data));
            expr = replaceChildAll(e1, new Slot(slotId));
            const body = top.data;
            expr = replaceChildAll(top, new LambdaExpression([slotId], body, nesting.length, e2.data));
            todo.push({prev: top, data: body, childIndex: 0}, {prev: top, data: e2.data, childIndex: 2});
        }
    }
    return expr.data;
}

/**
 * @param {Expression} ordinal
 * @param {number} n
 */
export function foundamentalSequence(ordinal, n) {
    /** @type {((ord: Expression) => Expression)[]} */
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
    if (ord instanceof Plus) {
        const last = ord.subexpressions[ord.subexpressions.length - 1];
        if (typeof last === 'number') {
            return new Plus(replacePart(ord.subexpressions, -1, last + 1));
        } else {
            return new Plus(ord.subexpressions.concat([1]));
        }
    }
    return new Plus([ord, 1]);
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
        } else {
            ordinal.maximizeAsync(cb, exec);
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
 * @param {Expression} ordinal1
 * @param {Expression} ordinal2
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
 * @param {Expression} ord
 * @param {DisplayOptions} opt
 */
export function toDisplayNotation(ord, opt) {
    /** @type {(Expression | ((stack: DisplayNotation[][]) => void))[]} */
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
 * @param {Expression} ord1
 * @param {Expression} ord2
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
 * @param {Expression[]} ords1
 * @param {Expression[]} ords2
 * @param {Expression} padding
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
