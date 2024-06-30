/** @import { HeldFunction, OrdinalExpression, PreorderList } from './types' */

const MML = "http://www.w3.org/1998/Math/MathML";

/**
 * @param {string} t
 */
function txt(t) {
    return document.createTextNode(t);
}

/**
 * @param {MathMLElement[]} elems
 */
function makeGroup(elems) {
    if (elems.length === 1) {
        return elems[0];
    } else {
        const ret = document.createElementNS(MML, 'mrow');
        for (const e of elems) {
            ret.appendChild(e);
        }
        return ret;
    }
}

/**
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
function top(arr) {
    return arr[arr.length - 1];
}

/**
 * @param {string} op
 */
function mo(op) {
    const ret = document.createElementNS(MML, 'mo');
    ret.append(op);
    return ret;
}

/**
 * @param {string} t
 */
function mn(t) {
    const ret = document.createElementNS(MML, 'mn');
    ret.append(t);
    return ret;
}

/**
 * @param {OrdinalExpression} ordinal
 */
export function ordinalToMathMLElements(ordinal) {
    /** @type {(HeldFunction<MathMLElement[]> | OrdinalExpression)[]} */
    const todo = [ordinal];
    /** @type {MathMLElement[][]} */
    const stack = [];
    while (todo.length > 0) {
        /** @type {HeldFunction<MathMLElement[]> | OrdinalExpression} */
        // @ts-ignore
        const top = todo.pop();
        if ('type' in top) {
            switch (top.type) {
                case 'number':
                    stack.push([mn(top.value.toString())]);
                    break;
                case 'omega':
                    stack.push([mn('\u03C9')]);
                    break;
                case 'plus':
                    todo.push({
                        isLeaf: false,
                        args: top.subexpressions.length,
                        handler(elems) {
                            /** @type {MathMLElement[]} */
                            const ret = [];
                            for (let i = 0; i < elems.length; i++) {
                                if (i > 0) {
                                    ret.push(mo('+'));
                                }
                                ret.push(...elems[i]);
                            }
                            return ret;
                        }
                    });
                    for (let a = top.subexpressions, i = a.length; i > 0; i--) {
                        todo.push(a[i - 1]);
                    }
                    break;
                case 'times':
                    todo.push({
                        isLeaf: false,
                        args: top.subexpressions.length,
                        handler(elems) {
                            /** @type {MathMLElement[]} */
                            const ret = [];
                            for (const elem of elems) {
                                ret.push(...elem);
                            }
                            return ret;
                        }
                    });
                    for (let a = top.subexpressions, i = a.length; i > 0; i--) {
                        todo.push(a[i - 1]);
                    }
                    break;
                case 'power':
                    todo.push({
                        isLeaf: false,
                        args: 2,
                        handler(elems) {
                            const ret = document.createElementNS(MML, 'msup');
                            ret.append(makeGroup(elems[0]), makeGroup(elems[1]));
                            return [ret];
                        }
                    });
                    todo.push(top.power, top.base);
                    break;
            }
        } else {
            /** @type {MathMLElement[][]} */
            const args = Array(top.args);
            for (let i = 0; i < args.length; i++) {
                // @ts-ignore
                args[args.length - 1 - i] = stack.pop();
            }
            stack.push(top.handler(args));
        }
    }
    return stack[0];
}

/**
 * @param {OrdinalExpression} ord
 */
export function ordinalToMathML(ord) {
    const ret = document.createElementNS(MML, 'math');
    ret.append(...ordinalToMathMLElements(ord));
    return ret;
}
