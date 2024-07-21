/** @import { DisplayOptions, Expression } from './types' */
/** @import { ExpandedOrdinalRow } from './app' */

import { ordinalToMathML } from './display.js';
import { compare, evaluateFoundamentalSequence, foundamentalSequenceFunction, isLimitOrdinal, OLO, stringify } from './ordinals.js';

/**
 * @param {Expression} expr
 * @param {Expression} previous
 */
function expandOrdinal(expr, previous) {
    const fs = foundamentalSequenceFunction(expr);
    let i = 0;
    while (true) {
        const ret = evaluateFoundamentalSequence(fs, i);
        if (compare(ret, previous) > 0) {
            return ret;
        } else if (i > 100) {
            throw new Error(`possible infinite loop detected when expanding ${stringify(expr)}, previous: ${stringify(previous)}, with fs = ${stringify(fs[0])}`);
        }
        i++;
    }
}

export class OrdinalExpander {
    constructor() {
        /** @type {HTMLDivElement} */
        this.root = document.createElement('div');

        /** @type {DisplayOptions} */
        this.displayOptions = {
            showSpecialVeblenFns: true,
            simplifiedOCFSubscripts: true,
        };

        /** @type {number} */
        this.idCounter = 0;

        this._createRow(OLO);
    }
    /**
     * @param {Expression} ordinal
     * @param {ExpandedOrdinalRow} [parent]
     */
    _createRow(ordinal, parent) {
        const container = document.createElement('div');
        /** @type {ExpandedOrdinalRow} */
        const ret = {
            id: this.idCounter++,
            container,
            ordinal,
            parent,
            children: [],
        };
        container.append(ordinalToMathML(ordinal, this.displayOptions));
        container.addEventListener('click', ev => {
            if (isLimitOrdinal(ordinal)) {
                const row = this._createRow(expandOrdinal(ordinal, ret.previous?.ordinal ?? 0), ret);
                row.previous = ret.previous;
                ret.previous = row;
            }
        });
        if (parent !== void 0) {
            this.root.insertBefore(container, parent.container);
        } else {
            this.root.appendChild(container);
        }
        return ret;
    }
}