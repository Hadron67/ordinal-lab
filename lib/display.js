/** @import { NestedArrayExpression, OrdinalExpression } from './types' */
/** @import { DisplayOptions } from './app' */

const MML = "http://www.w3.org/1998/Math/MathML";

/**
 * @param {string} t
 */
function txt(t) {
    return document.createTextNode(t);
}

/**
 * @param {(MathMLElement | string)[]} elems
 */
function makeGroup(elems) {
    if (elems.length === 1) {
        return elems[0];
    } else {
        const ret = document.createElementNS(MML, 'mrow');
        for (const e of elems) {
            ret.append(e);
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
 * @param {string} t
 */
function mi(t) {
    const ret = document.createElementNS(MML, 'mi');
    ret.append(t);
    return ret;
}

/**
 * @param {(MathMLElement | string)[]} base
 * @param {(MathMLElement | string)[]} exp
 */
function msup(base, exp) {
    const ret = document.createElementNS(MML, 'msup');
    ret.append(makeGroup(base), makeGroup(exp));
    return ret;
}

/**
 * @param {(string | MathMLElement)[]} base
 * @param {(string | MathMLElement)[]} sub
 */
function msub(base, sub) {
    const ret = document.createElementNS(MML, 'msub');
    ret.append(makeGroup(base), makeGroup(sub));
    return ret;
}

const SPECIAL_VEBLEN_FN_NAMES = ['\u03B5', '\u03B6', '\u03B7'];

/**
 * @typedef {((stack: MathMLElement[][]) => any) | OrdinalExpression | NestedArrayExpression} TodoElement
 * @param {NestedArrayExpression} array
 * @param {string} fnHead
 * @param {boolean} specialValues
 * @param {TodoElement[]} todo
 */
function convertArrayOrdinal(array, fnHead, specialValues, todo) {
    if (array.kw.length === 0) {
        const args = array.positional;
        if (fnHead === 'phi' && specialValues && args.length === 2 && typeof args[1] === 'number' && args[1] < SPECIAL_VEBLEN_FN_NAMES.length + 1) {
            const ch = SPECIAL_VEBLEN_FN_NAMES[args[1] - 1];
            todo.push(stack => {
                const ret = document.createElementNS(MML, 'msub');
                ret.append(ch, makeGroup(stack[stack.length - 1]));
                stack[stack.length - 1] = [ret];
            });
            todo.push(args[0]);
        } else {
            const len = args.length;
            todo.push(stack => {
                /** @type {MathMLElement[]} */
                const ret = [];
                if (fnHead.length > 0) {
                    ret.push(mi(fnHead === 'phi' ? '\u03C6' : fnHead), mo('('));
                } else {
                    ret.push(mo('['));
                }
                for (let i = 0; i < len; i++) {
                    if (i > 0) {
                        ret.push(mo(','));
                    }
                    ret.push(...stack[stack.length - len + i]);
                }
                ret.push(mo(fnHead.length > 0 ? ')' : ']'));
                stack.length -= len;
                stack.push(ret);
            });
            todo.push(...args);
        }
    } else {
        let len = 0;
        todo.push(stack => {
            /** @type {MathMLElement[]} */
            const ret = [];
            if (fnHead.length > 0) {
                ret.push(mi(fnHead === 'phi' ? '\u03C6' : fnHead), mo('('));
            } else {
                ret.push(mo('['));
            }
            for (let i = 0; i < len; i++) {
                const coord = stack[stack.length - 2*len + 2*i];
                const val = stack[stack.length - 2*len + 2*i + 1];
                if (i > 0) {
                    ret.push(mo(','));
                }
                ret.push(...coord, mo(':'), ...val);
            }
            ret.push(mo(fnHead.length > 0 ? ')' : ']'));
            stack.length -= 2*len;
            stack.push(ret);
        });
        for (let i = 0, a = array.positional; i < a.length; i++) {
            const arg = a[i];
            if (arg === 0) {
                todo.push(arg);
                todo.push(i);
                len++;
            }
        }
        for (let a = array.kw, i = a.length; i > 0; i--) {
            const [coord, val] = a[i];
            todo.push(val, coord);
            len++;
        }
    }
}

/**
 * @param {OrdinalExpression} ordinal
 * @param {DisplayOptions} opt
 */
export function ordinalToMathMLElements(ordinal, opt) {
    /** @type {TodoElement[]} */
    const todo = [ordinal];
    /** @type {MathMLElement[][]} */
    const stack = [];
    while (todo.length > 0) {
        /** @type {TodoElement} */
        // @ts-ignore
        const top = todo.pop();
        if (typeof top === 'number') {
            stack.push([mn(top.toString())]);
        } else if ('type' in top) {
            switch (top.type) {
                case 'omega':
                    stack.push([mi('\u03C9')]);
                    break;
                case 'symbol':
                    stack.push([mi(top.value)]);
                    break;
                case 'plus': {
                    let len = top.subexpressions.length;
                    todo.push(stack => {
                        /** @type {MathMLElement[]} */
                        const ret = [];
                        for (let i = 0; i < len; i++) {
                            if (i > 0) {
                                ret.push(mo('+'));
                            }
                            ret.push(...stack[stack.length - len + i]);
                        }
                        stack.length -= len;
                        stack.push(ret);
                    });
                    for (let a = top.subexpressions, i = a.length; i > 0; i--) {
                        todo.push(a[i - 1]);
                    }
                    break;
                }
                case 'times': {
                    let len = top.subexpressions.length;
                    todo.push(stack => {
                        /** @type {MathMLElement[]} */
                        const ret = [];
                        for (let i = 0; i < len; i++) {
                            ret.push(...stack[stack.length - len + i]);
                        }
                        stack.length -= len;
                        stack.push(ret);
                    });
                    for (let a = top.subexpressions, i = len; i > 0; i--) {
                        todo.push(a[i - 1]);
                    }
                    break;
                }
                case 'power':
                    todo.push(stack => {
                        const len = stack.length;
                        const ret = msup(stack[len - 2], stack[len - 1]);
                        stack.length -= 2;
                        stack.push([ret]);
                    });
                    todo.push(top.power, top.base);
                    break;
                case 'veblen':
                    convertArrayOrdinal(top, 'phi', opt.showSpecialVeblenFns, todo);
                    break;
                case 'omega-n': {
                    const sub = top.sub;
                    if (sub === 1) {
                        stack.push([mi('\u03A9')]);
                    } else {
                        todo.push(stack => {
                            const ret = msub(['\u03A9'], stack[stack.length - 1]);
                            stack.length--;
                            stack.push([ret]);
                        });
                        todo.push(sub);
                    }
                    break;
                }
            }
        } else if ('positional' in top) {
            convertArrayOrdinal(top, '', opt.showSpecialVeblenFns, todo);
        } else {
            top(stack);
        }
    }
    return stack[0];
}

/**
 * @param {OrdinalExpression} ord
 * @param {DisplayOptions} opt
 */
export function ordinalToMathML(ord, opt) {
    const ret = document.createElementNS(MML, 'math');
    ret.append(...ordinalToMathMLElements(ord, opt));
    return ret;
}
