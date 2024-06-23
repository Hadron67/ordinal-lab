/** @import { OrdinalExpression } from './types' */
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
 * @param {OrdinalExpression} ordinal
 */
function ordinalToMathMLElements2(ordinal) {
    
}

/**
 * @param {OrdinalExpression} ordinal
 * @param {(a: MathMLElement) => any} consumer
 */
function ordinalToMathMLElements(ordinal, consumer) {
    switch (ordinal.type) {
        case 'number': {
            const ret = document.createElementNS(MML, 'mn');
            ret.appendChild(txt(ordinal.value.toString()));
            consumer(ret);
            break;
        }
        case 'plus': {
            let first = true;
            for (const elem of ordinal.subexpressions) {
                if (!first) {
                    const plus = document.createElementNS(MML, 'mo');
                    plus.appendChild(txt('+'));
                    consumer(plus);
                } else {
                    first = false;
                }
                ordinalToMathMLElements(elem, consumer);
            }
            break;
        }
        case 'times': {
            for (const elem of ordinal.subexpressions) {
                ordinalToMathMLElements(elem, consumer);
            }
            break;
        }
        case 'power': {
            const ret = document.createElementNS(MML, 'msup');
            /** @type {MathMLElement[]} */
            const sup = [];
            /** @type {MathMLElement[]} */
            const sub = [];
            ordinalToMathMLElements(ordinal.base, e => sub.push(e));
            ordinalToMathMLElements(ordinal.power, e => sup.push(e));
            ret.appendChild(makeGroup(sub));
            ret.appendChild(makeGroup(sup));
            consumer(ret);
            break;
        }
        case 'omega': {
            const ret = document.createElementNS(MML, 'mn');
            ret.appendChild(txt('\u03C9'));
            consumer(ret);
            break;
        }
    }
}

/**
 * @param {OrdinalExpression} ord
 */
export function ordinalToMathML(ord) {
    const ret = document.createElementNS(MML, 'math');
    ordinalToMathMLElements(ord, e => ret.appendChild(e));
    return ret;
}
