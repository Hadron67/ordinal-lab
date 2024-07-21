/** @import { DisplayOptions, Expression, NestedArrayExpression } from './types' */

const MML = "http://www.w3.org/1998/Math/MathML";

const CHAR_LOWER_ALPHA = '\u03B1';
const CHAR_LOWER_BETA = '\u03B2';
const CHAR_LOWER_GAMMA = '\u03B3';
const CHAR_LOWER_DELTA = '\u03B4';
const CHAR_LOWER_OMEGA = '\u03C9';
const CHAR_RIGHT_ARROW = '\u2192';
const CHAR_UPPER_OMEGA = '\u03A9';
const CHAR_LOWER_PSI = '\u03C8';

const GREEKS = [
    CHAR_LOWER_ALPHA,
    CHAR_LOWER_BETA,
    CHAR_LOWER_GAMMA,
    CHAR_LOWER_DELTA,
];

/**
 * @param {string} t
 */
function txt(t) {
    return document.createTextNode(t);
}

/**
 * @param {string} op
 */
function moNoStrechy(op) {
    const ret = document.createElementNS(MML, 'mo');
    const attr = document.createAttributeNS(MML, 'stretchy');
    attr.value = 'false';
    ret.attributes.setNamedItemNS(attr);
    ret.append(op);
    return ret;
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
 * @typedef {((stack: MathMLElement[][]) => any) | Expression | NestedArrayExpression} TodoElement
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
                    ret.push(mi(fnHead === 'phi' ? '\u03C6' : fnHead), moNoStrechy('('));
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
                ret.push(mi(fnHead === 'phi' ? '\u03C6' : fnHead), moNoStrechy('('));
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
 * @param {number} id
 */
function slot(id) {
    return [id < GREEKS.length ? mi(GREEKS[id]) : msub([CHAR_LOWER_ALPHA], [id.toString()])];
}

/**
 * @param {Expression} ordinal
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
                    stack.push([mi(CHAR_LOWER_OMEGA)]);
                    break;
                case 'slot':
                    stack.push(slot(top.id));
                    break;
                case 'olo':
                    stack.push([mi('OLO')]);
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
                case 'lambda': {
                    const hasApplied = top.appliedTo !== void 0;
                    const args = top.args;
                    todo.push(stack => {
                        /** @type {MathMLElement[]} */
                        const ret = [];
                        if (hasApplied) {
                            const body = stack[stack.length - 3];
                            const iterations = stack[stack.length - 2];
                            const appliedTo = stack[stack.length - 1];
                            stack.length -= 3;
                            /** @type {MathMLElement[]} */
                            const ret2 = [];
                            ret2.push(moNoStrechy('('));
                            if (args.length === 1) {
                                ret2.push(...slot(args[0]));
                            }
                            ret2.push(mo(CHAR_RIGHT_ARROW), ...body, moNoStrechy(')'));
                            ret.push(msup(ret2, [moNoStrechy('('), ...iterations, moNoStrechy(')')]), moNoStrechy('('), ...appliedTo, moNoStrechy(')'));
                        }
                        stack.push(ret);
                    });
                    if (top.appliedTo !== void 0) { todo.push(top.appliedTo); }
                    todo.push(top.iterations, top.body);
                    break;
                }
                case 'veblen':
                    convertArrayOrdinal(top, 'phi', opt.showSpecialVeblenFns, todo);
                    break;
                case 'omega-n': {
                    const sub = top.subscript;
                    if (sub === 1) {
                        stack.push([mi(CHAR_UPPER_OMEGA)]);
                    } else {
                        todo.push(stack => {
                            const ret = msub([mi(CHAR_UPPER_OMEGA)], stack[stack.length - 1]);
                            stack.length--;
                            stack.push([ret]);
                        }, sub);
                    }
                    break;
                }
                case 'ocf': {
                    const {subscript, arg} = top;
                    if (opt.simplifiedOCFSubscripts && typeof subscript === 'object' && subscript.type === 'omega-n' && typeof subscript.subscript === 'number') {
                        const ss = subscript.subscript;
                        todo.push(stack => {
                            const arg = stack[stack.length - 1];
                            stack.length--;
                            if (ss === 1) {
                                stack.push([mi(CHAR_LOWER_PSI), moNoStrechy('('), ...arg, moNoStrechy(')')]);
                            } else {
                                stack.push([msub([mi(CHAR_LOWER_PSI)], [mn((ss - 1).toString())]), moNoStrechy('('), ...arg, moNoStrechy(')')]);
                            }
                        }, arg);
                    } else {
                        todo.push(stack => {
                            const arg = stack[stack.length - 2];
                            const sub = stack[stack.length - 1];
                            stack.length -= 2;
                            stack.push([msub([mi(CHAR_LOWER_PSI)], sub), moNoStrechy('('), ...arg, moNoStrechy(')')]);
                        }, subscript, arg);
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
 * @param {Expression} ord
 * @param {DisplayOptions} opt
 */
export function ordinalToMathML(ord, opt) {
    const ret = document.createElementNS(MML, 'math');
    ret.append(...ordinalToMathMLElements(ord, opt));
    return ret;
}
