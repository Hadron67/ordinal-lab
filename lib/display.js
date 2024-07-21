/** @import { DisplayNotation, DisplayOptions, Expression, NestedArrayExpression, OrdinalWriter } from './types' */
/** @import { DisplayMode, DisplayModeSettings } from './app.js' */

import { stringify } from './ordinals.js';
import { pushReversed } from './utils.js';

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

/** @type {DisplayNotation[]} */
const GREEK_NOTATIONS = [
    {type: 'alpha'},
    {type: 'beta'},
    {type: 'gamma'},
];

/**
 * @param {string} t
 */
function txt(t) {
    return document.createTextNode(t);
}

/**
 * @param {string} op
 * @param {boolean} val
 */
function moNoStrechy(op, val) {
    const ret = document.createElementNS(MML, 'mo');
    const attr = document.createAttribute('stretchy');
    attr.value = val ? 'true' : 'false';
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
 * @returns {DisplayNotation}
 */
function slot(id) {
    return id < GREEK_NOTATIONS.length ? GREEK_NOTATIONS[id] : {type: 'sub', expr: [{type: 'alpha'}], subscript: [id]};
}

/**
 * @template T
 * @param {T[]} arr
 * @param {T | T[]} a
 */
function pushArrayOrOne(arr, a) {
    if (Array.isArray(a)) {
        arr.push(...a);
    } else arr.push(a);
}

/**
 * @param {Expression} ordinal
 * @param {DisplayOptions} opt
 */
export function ordinalToDisplayNotation(ordinal, opt) {
    /** @type {(((stack: DisplayNotation[]) => void) | Expression)[]} */
    const todo = [ordinal];
    /** @type {DisplayNotation[]} */
    const stack = [];
    while (todo.length > 0) {
        /** @type {typeof todo[0]} */
        // @ts-ignore
        const top = todo.pop();
        if (typeof top === 'number') {
            stack.push([top]);
        } else if ('type' in top) {
            switch (top.type) {
                case 'omega':
                    stack.push({type: 'omega'});
                    break;
                case 'slot':
                    stack.push(slot(top.id));
                    break;
                case 'olo':
                    stack.push({type: 'mi', text: 'OLO'});
                    break;
                case 'plus': {
                    let len = top.subexpressions.length;
                    todo.push(stack => {
                        /** @type {DisplayNotation[]} */
                        const ret = [];
                        for (let i = 0; i < len; i++) {
                            if (i > 0) {
                                ret.push({type: 'mo', text: '+'});
                            }
                            pushArrayOrOne(ret, stack[stack.length - len + i]);
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
                        /** @type {DisplayNotation[]} */
                        const ret = [];
                        for (let i = 0; i < len; i++) {
                            pushArrayOrOne(ret, stack[stack.length - len + i]);
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
                        /** @type {DisplayNotation} */
                        const ret = {type: 'sup', expr: stack[len - 2], superscript: stack[len - 1]};
                        stack.length -= 2;
                        stack.push([ret]);
                    });
                    todo.push(top.power, top.base);
                    break;
                case 'lambda': {
                    const hasApplied = top.appliedTo !== void 0;
                    const args = top.args;
                    todo.push(stack => {
                        /** @type {DisplayNotation[]} */
                        const ret = [];
                        if (hasApplied) {
                            const body = stack[stack.length - 3];
                            const iterations = stack[stack.length - 2];
                            const appliedTo = stack[stack.length - 1];
                            stack.length -= 3;
                            /** @type {DisplayNotation[]} */
                            const ret2 = [];
                            if (args.length === 1) {
                                ret2.push(slot(args[0]));
                            }
                            ret2.push({type: 'right-arrow'});
                            pushArrayOrOne(ret2, body);
                            ret.push({type: 'sup', expr: [{type: 'paren', expr: ret2}], superscript: [{type: 'paren', expr: iterations}]}, {type: 'paren', expr: appliedTo});
                        }
                        stack.push(ret);
                    });
                    if (top.appliedTo !== void 0) { todo.push(top.appliedTo); }
                    todo.push(top.iterations, top.body);
                    break;
                }
                // case 'veblen':
                //     convertArrayOrdinal(top, 'phi', opt.showSpecialVeblenFns, todo);
                //     break;
                case 'omega-n': {
                    const sub = top.subscript;
                    if (sub === 1) {
                        stack.push([{type: 'Omega'}]);
                    } else {
                        todo.push(stack => {
                            /** @type {DisplayNotation} */
                            const ret = {type: 'sub', expr: [{type: 'Omega'}], subscript: stack[stack.length - 1]};
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
                                stack.push([{type: 'psi'}, {type: 'paren', expr: arg}]);
                            } else {
                                stack.push([{type: 'sub', expr: [{type: 'psi'}], subscript: [ss - 1]}, {type: 'paren', expr: arg}]);
                            }
                        }, arg);
                    } else {
                        todo.push(stack => {
                            const arg = stack[stack.length - 2];
                            const sub = stack[stack.length - 1];
                            stack.length -= 2;
                            stack.push([{type: 'sub', expr: [{type: 'psi'}], subscript: sub}, {type: 'paren', expr: arg}]);
                        }, subscript, arg);
                    }
                    break;
                }
            }
        } else if ('positional' in top) {
            // convertArrayOrdinal(top, '', opt.showSpecialVeblenFns, todo);
        } else {
            top(stack);
        }
    }
    return stack[0];
}

/**
 * @param {DisplayNotation} notation
 * @param {DisplayModeSettings} opt
 */
export function displayNotationToMathMLElements(notation, opt) {
    /** @type {MathMLElement[][]} */
    const stack = [];
    /** @type {(((s: MathMLElement[][]) => void) | DisplayNotation)[]} */
    const todo = [notation];
    while (todo.length > 0) {
        /** @type {typeof todo[0]} */
        // @ts-ignore
        const top = todo.pop();
        if (typeof top === 'number') {
            stack.push([mn(top.toString())]);
        } else if (typeof top === 'function') {
            top(stack);
        } else if (Array.isArray(top)) {
            const len = top.length;
            todo.push(stack => {
                /** @type {MathMLElement[]} */
                const ret = [];
                for (let i = 0; i < len; i++) {
                    ret.push(...stack[stack.length - len + i]);
                }
                stack.length -= len;
                stack.push(ret);
            });
            pushReversed(todo, top);
        } else switch (top.type) {
            case 'Omega': stack.push([mi(CHAR_UPPER_OMEGA)]); break;
            case 'omega': stack.push([mi(CHAR_LOWER_OMEGA)]); break;
            case 'alpha': stack.push([mi(CHAR_LOWER_ALPHA)]); break;
            case 'beta': stack.push([mi(CHAR_LOWER_BETA)]); break;
            case 'gamma': stack.push([mi(CHAR_LOWER_GAMMA)]); break;
            case 'psi': stack.push([mi(CHAR_LOWER_PSI)]); break;
            case 'right-arrow': stack.push([mo(CHAR_RIGHT_ARROW)]); break;
            case 'mo': stack.push([mo(top.text)]); break;
            case 'mi': stack.push([mi(top.text)]); break;
            case 'paren': {
                todo.push(stack => {
                    const ret = [moNoStrechy('(', opt.stretchyBrackets), ...stack[stack.length - 1], moNoStrechy(')', opt.stretchyBrackets)];
                    stack.length--;
                    stack.push(ret);
                }, top.expr);
                break;
            }
            case 'sub': {
                todo.push(stack => {
                    const expr = stack[stack.length - 2];
                    const sub = stack[stack.length - 1];
                    stack.length -= 2;
                    stack.push([msub(expr, sub)]);
                }, top.subscript, top.expr);
                break;
            }
            case 'sup': {
                todo.push(stack => {
                    const expr = stack[stack.length - 2];
                    const sub = stack[stack.length - 1];
                    stack.length -= 2;
                    stack.push([msup(expr, sub)]);
                }, top.superscript, top.expr);
                break;
            }
        }
    }
    return stack[0];
}

/**
 * @template T
 * @param {(T | string)[]} arr
 */
function combineStringArr(arr) {
    /** @type {(T | string)[]} */
    const ret = [];
    for (const a of arr) {
        if (typeof a === 'string' && typeof ret[ret.length - 1] === 'string') {
            ret[ret.length - 1] += a;
        } else ret.push(a);
    }
    return ret;
}

/**
 * @param {DisplayNotation} ord
 * @param {any} opt
 */
export function displayNotationToHTML(ord, opt) {
    /** @type {(string | HTMLElement)[][]} */
    const stack = [];
    /** @type {(((s: typeof stack) => void) | DisplayNotation)[]} */
    const todo = [ord];
    while (todo.length > 0) {
        /** @type {typeof todo[0]} */
        // @ts-ignore
        const top = todo.pop();
        if (typeof top === 'number') {
            stack.push([top.toString()]);
        } else if (Array.isArray(top)) {
            const len = top.length;
            todo.push(stack => {
                /** @type {typeof stack[0]} */
                const ret = [];
                for (let i = 0; i < len; i++) {
                    ret.push(...stack[stack.length - len + i]);
                }
                stack.length -= len;
                stack.push(combineStringArr(ret));
            });
            pushReversed(todo, top);
        } else if (typeof top === 'function') {
            top(stack);
        } else switch (top.type) {
            case 'Omega': stack.push([CHAR_UPPER_OMEGA]); break;
            case 'omega': stack.push([CHAR_LOWER_OMEGA]); break;
            case 'psi': stack.push([CHAR_LOWER_PSI]); break;
            case 'alpha': stack.push([CHAR_LOWER_ALPHA]); break;
            case 'beta': stack.push([CHAR_LOWER_BETA]); break;
            case 'gamma': stack.push([CHAR_LOWER_GAMMA]); break;
            case 'right-arrow': stack.push([CHAR_RIGHT_ARROW]); break;
            case 'mi':
            case 'mo': stack.push([top.text]); break;
            case 'sub': {
                todo.push(stack => {
                    const expr = stack[stack.length - 2];
                    const sub = stack[stack.length - 1];
                    stack.length -= 2;
                    const elem = document.createElement('sub');
                    elem.append(...combineStringArr(sub));
                    stack.push(expr.concat([elem]));
                }, top.subscript, top.expr);
                break;
            }
            case 'sup': {
                todo.push(stack => {
                    const expr = stack[stack.length - 2];
                    const sub = stack[stack.length - 1];
                    stack.length -= 2;
                    const elem = document.createElement('sup');
                    elem.append(...combineStringArr(sub));
                    stack.push(expr.concat([elem]));
                }, top.superscript, top.expr);
                break;
            }
            case 'paren': {
                todo.push(stack => {
                    const ret = combineStringArr(['(', ...stack[stack.length - 1], ')']);
                    stack.pop();
                    stack.push(ret);
                }, top.expr);
                break;
            }
        }
    }
    return stack[0];
}

/**
 * @param {DisplayNotation} ord
 * @param {DisplayModeSettings} opt
 */
export function displayNotationToMathML(ord, opt) {
    const ret = document.createElementNS(MML, 'math');
    ret.append(...displayNotationToMathMLElements(ord, opt));
    return ret;
}

/**
 * @param {Expression} ord
 * @param {HTMLElement} element
 * @param {DisplayModeSettings} opt
 */
export function renderExpression(ord, element, opt) {
    const dis = ordinalToDisplayNotation(ord, opt);
    switch (opt.mode) {
        case 'mathml': element.replaceChildren(displayNotationToMathML(dis, opt)); break;
        case 'html': element.replaceChildren(...displayNotationToHTML(dis, opt)); break;
        case 'm': element.replaceChildren(stringify(ord)); break;
    }
}
