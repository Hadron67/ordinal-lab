/** @import { DisplayNotation, NestedArrayExpression, OrdinalExpression } from './types' */

import { popMany, pushReversed } from './utils.js';

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

/**
 * @param {DisplayNotation[]} notation
 */
export function displayNotationToMathML(notation) {
    /** @type {(DisplayNotation | ((stack: MathMLElement[]) => void))[]} */
    const todo = [];
    pushReversed(todo, notation);
    /** @type {MathMLElement[]} */
    const stack = [];
    while (todo.length > 0) {
        /** @type {DisplayNotation | ((stack: MathMLElement[]) => void)} */
        // @ts-ignore
        const top = todo.pop();
        if (typeof top === 'function') {
            top(stack);
        } else {
            if (typeof top === 'number') {
                stack.push(mn(top.toString()));
            } else switch (top.type) {
                case 'mi': stack.push(mi(top.value)); break;
                case 'mo': stack.push(mo(top.value)); break;
                case 'superscript': {
                    const baseLen = top.expr.length;
                    const supLen = top.superscript.length;
                    todo.push(stack => {
                        const base = popMany(stack, baseLen);
                        const sup = popMany(stack, supLen);
                        stack.push(msup(base, sup));
                    });
                    todo.push(...top.expr, ...top.superscript);
                    break;
                }
                case 'subscript': {
                    const baseLen = top.expr.length;
                    const supLen = top.subscript.length;
                    todo.push(stack => {
                        const base = popMany(stack, baseLen);
                        const sup = popMany(stack, supLen);
                        stack.push(msub(base, sup));
                    });
                    todo.push(...top.expr, ...top.subscript);
                    break;
                }
            }
        }
    }
    const ret = document.createElementNS(MML, 'math');
    ret.append(...stack);
    return ret;
}