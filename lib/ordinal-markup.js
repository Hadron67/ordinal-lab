/** @import { DisplayOptions, Expression } from './types/ordinal.js' */
/** @import { DisplayModeSettings, OrdinalMarkupConfig } from './types/app' */

import { renderExpression } from "./display.js";
import { foldAllNestings, maximize, maximizeOne, OLO, OMEGA, stringify, successor } from "./ordinals.js";

/**
 * @param {number} base
 * @returns {[number, boolean]}
 */
function validateBase(base) {
    if (isNaN(base)) {
        return [10, false];
    } else if (base < 2) {
        return [2, false];
    } else {
        return [base, true];
    }
}

export class OrdinalMarkup {
    constructor() {
        /** @type {HTMLDivElement} */
        this.root = document.createElement('div');
        /** @type {HTMLDivElement} */
        this.ordinalDisplay = document.createElement('div');

        /** @type {HTMLButtonElement} */
        this.btn = document.createElement('button');
        this.btn.type = 'button';
        this.btn.append("+");

        /** @type {HTMLButtonElement} */
        this.btnMaximize = document.createElement('button');
        this.btnMaximize.type = "button";
        this.btnMaximize.append('Maximize');

        /** @type {HTMLInputElement} */
        this.clickRepeats = document.createElement('input');
        this.clickRepeats.type = 'number';
        this.clickRepeats.value = '1';

        /** @type {HTMLInputElement} */
        this.baseInput = document.createElement('input');
        this.baseInput.type = 'number';
        this.baseInput.value = "3";
        this.baseInput.step = "1";
        this.baseInput.min = "2";

        /** @type {HTMLInputElement} */
        this.maximizerSwitch = document.createElement('input');
        this.maximizerSwitch.type = 'checkbox';
        this.maximizerSwitch.checked = false;

        /** @type {HTMLInputElement} */
        this.autoClickerSwitch = document.createElement('input');
        this.autoClickerSwitch.type = 'checkbox';

        /** @type {HTMLInputElement} */
        this.foldNestingSwitch = document.createElement('input');
        this.foldNestingSwitch.type = 'checkbox';
        this.foldNestingSwitch.checked = false;

        /** @type {DisplayModeSettings} */
        this.displayOptions = {
            showSpecialVeblenFns: true,
            simplifiedOCFSubscripts: true,
            mode: 'mathml',
            stretchyBrackets: false,
        };

        const fieldSet = document.createElement('fieldset');
        {
            const legend = document.createElement('legend');
            legend.append('Settings');
            fieldSet.appendChild(legend);
        }
        /**
         * @param {string} label
         * @param {HTMLElement} elem
         */
        function appendField(label, elem) {
            const div = document.createElement('div');
            const lab = document.createElement('label');
            lab.append(label);
            div.append(lab, elem);
            fieldSet.appendChild(div);
        }
        appendField('Repeats', this.clickRepeats);
        appendField('Base', this.baseInput);
        appendField('Auto clicker', this.autoClickerSwitch);
        appendField('Auto maximizer', this.maximizerSwitch);
        appendField('Fold Nestings', this.foldNestingSwitch);

        this.root.append(this.ordinalDisplay, this.btn, this.btnMaximize, fieldSet);

        /** @type {Expression} */
        this.ordinal = 0;

        this.btn.addEventListener('click', event => {
            this._clickSuccessor();
            this._updateDisplay();
        });
        this.btnMaximize.addEventListener('click', event => {
            const m = maximizeOne(this.ordinal, OLO, validateBase(Number(this.baseInput.value))[0]);
            if (m !== null) {
                this.ordinal = m;
                this._updateDisplay();
            }
        });
        this.maximizerSwitch.addEventListener('change', ev => {
            this._maximize();
            this._updateDisplay();
        });
        this.baseInput.addEventListener('change', function(ev) {
            if (!validateBase(Number(this.value))[1]) {
                this.classList.add('error');
            } else {
                this.classList.remove('error');
            }
        });
        this.autoClickerSwitch.addEventListener('change', ev => {
            this._autoClick();
        });
        this.foldNestingSwitch.addEventListener('change', ev => this._updateDisplay());
        this._updateDisplay();
    }
    _autoClick() {
        if (this.autoClickerSwitch.checked) {
            this._clickSuccessor();
            this._updateDisplay();
            requestAnimationFrame(() => this._autoClick());
        }
    }
    _clickSuccessor() {
        let repeats = Number(this.clickRepeats.value);
        for (let i = 0; i < repeats; i++) {
            this._clickSuccessorOnce();
        }
    }
    _clickSuccessorOnce() {
        this.ordinal = successor(this.ordinal);
        this._maximize();
    }
    _maximize() {
        if (this.maximizerSwitch.checked) {
            const m = maximize(this.ordinal, OLO, validateBase(Number(this.baseInput.value))[0]);
            if (m !== null) this.ordinal = m;
        }
    }
    _updateDisplay() {
        const ord = this.foldNestingSwitch.checked ? foldAllNestings(this.ordinal) : this.ordinal;
        renderExpression(ord, this.ordinalDisplay, this.displayOptions);
    }
    /**
     * @returns {OrdinalMarkupConfig}
     */
    getConfig() {
        return {
            ordinal: stringify(this.ordinal),
            clickRepeats: Number(this.clickRepeats.value),
            base: Number(this.baseInput.value),
            autoClicker: this.autoClickerSwitch.checked,
            autoMaximize: this.maximizerSwitch.checked,
        };
    }
}
