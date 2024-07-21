/** @import { DisplayOptions, Expression } from './types' */
/** @import { DisplayModeSettings, ExpandedOrdinalRow, LList, OrdinalSublist } from './app' */

import { OptionsPanel } from './display-options.js';
import { displayNotationToMathML, ordinalToDisplayNotation, renderExpression } from './display.js';
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

        /** @type {HTMLUListElement} */
        this.ordinalsContainer = document.createElement('ul');
        this.ordinalsContainer.className = 'ordinal-expand-list';

        /** @type {HTMLButtonElement} */
        this.btnClear = document.createElement('button');
        this.btnClear.type = 'button';
        this.btnClear.addEventListener('click', ev => {
            this.deselect();
            this.ordinalsContainer.replaceChildren();
            this.oloRow = this._createRow(OLO);
        });
        this.btnClear.append('Reset');

        /** @type {HTMLButtonElement} */
        this.btnSettings = document.createElement('button');
        this.btnSettings.type = 'button';

        /** @type {DisplayModeSettings} */
        this.displayOptions = {
            showSpecialVeblenFns: true,
            simplifiedOCFSubscripts: true,
            mode: 'mathml',
            stretchyBrackets: false,
        };

        /** @type {number} */
        this.idCounter = 0;

        /** @type {HTMLDivElement} */
        this.ordinalMenu = document.createElement('div');
        this.ordinalMenu.className = 'menu';
        {
            const btnExpand = document.createElement('button');
            btnExpand.type = 'button';
            btnExpand.append('+');
            const btnDelete = document.createElement('button');
            btnDelete.type = 'button';
            btnDelete.append('-');
            const btnExpandAll = document.createElement('button');
            btnExpandAll.append('++');
            btnExpandAll.type = 'button';
            btnExpand.addEventListener('click', ev => {
                const sel = this.selected;
                if (sel != null && isLimitOrdinal(sel.ordinal)) {
                    this._createRow(expandOrdinal(sel.ordinal, sel.previous?.ordinal ?? 0), sel);
                }
            });
            btnDelete.addEventListener('click', ev => {
                const sel = this.selected;
                if (sel !== null) {
                    this.ordinalMenu.remove();
                    sel.container.remove();
                    if (sel.next) {
                        sel.next.previous = sel.previous;
                    }
                    if (sel.previous) {
                        sel.previous.next = sel.next;
                    }
                    this.selected = null;
                }
            });
            btnExpandAll.addEventListener('click', ev => {
                const sel = this.selected;
                if (sel !== null) {
                    let sel2 = sel;
                    while (isLimitOrdinal(sel2.ordinal)) {
                        sel2 = this._createRow(expandOrdinal(sel2.ordinal, sel2.previous?.ordinal ?? 0), sel2);
                    }
                }
            });
            this.ordinalMenu.append(btnExpand, btnExpandAll, btnDelete);
        }
        /** @type {ExpandedOrdinalRow | null} */
        this.selected = null;

        /** @type {OptionsPanel} */
        this.optionsPanel = new OptionsPanel('Options', [
            {key: 'showSpecialVeblenFns', description: 'Show special Veblen functions', data: {type: 'bool'}},
            {key: 'simplifiedOCFSubscripts', description: 'Simplified OCF subscripts', data: {type: 'bool'}},
            {key: 'mode', description: 'Display mode', data: {type: 'enum', candidates: [
                ['mathml', 'MathML'],
                ['html', 'Plain HTML'],
                ['m', 'M-expression'],
            ]}},
            {key: 'stretchyBrackets', description: 'Stretchy brackets (only works when mode = MathML)', data: {type: 'bool'}}
        ], this.displayOptions, (k, v) => {
            this.displayOptions = v;
            this.refreshExpressions();
        });

        /** @type {ExpandedOrdinalRow} */
        this.oloRow = this._createRow(OLO);
        this.root.append(
            this.optionsPanel.root,
            this.btnClear,
            this.ordinalsContainer,
        );
    }
    deselect() {
        if (this.ordinalMenu.isConnected) {
            this.ordinalMenu.remove();
        }
        if (this.selected !== null) {
            this.selected.container.classList.remove('selected');
        }
        this.selected = null;
    }
    handleOnClick() {
        this.deselect();
    }
    refreshExpressions() {
        /** @type {ExpandedOrdinalRow | undefined} */
        let a = this.oloRow;
        for (; a; a = a.previous) {
            renderExpression(a.ordinal, a.expressionContainer, this.displayOptions);
        }
    }
    /**
     * @private
     * @param {Expression} ordinal
     * @param {ExpandedOrdinalRow} [next]
     */
    _createRow(ordinal, next) {
        const container = document.createElement('li');
        const expressionContainer = document.createElement('div');
        /** @type {ExpandedOrdinalRow} */
        const ret = {
            id: this.idCounter++,
            container,
            ordinal,
            next,
            expressionContainer,
        };
        renderExpression(ordinal, expressionContainer, this.displayOptions);
        container.append(expressionContainer);
        container.addEventListener('click', ev => {
            this.deselect();
            container.appendChild(this.ordinalMenu);
            this.selected = ret;
            ret.container.classList.add('selected');
        });
        if (next) {
            if (next.previous) {
                next.previous.next = ret;
            }
            ret.previous = next.previous;
            next.previous = ret;
            this.ordinalsContainer.insertBefore(ret.container, next.container);
        } else {
            this.ordinalsContainer.appendChild(ret.container);
        }
        return ret;
    }
}