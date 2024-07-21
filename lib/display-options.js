/** @import { OptionItem } from './app' */

export class OptionsPanel {
    /**
     * @param {string} title
     * @param {OptionItem[]} options
     * @param {any} initialValue
     * @param {(key: string, value: any) => void} onValueChange
     */
    constructor(title, options, initialValue, onValueChange) {
        /** @type {HTMLDivElement} */
        this.root = document.createElement('div');
        this.root.classList.add('options');
        const legend = document.createElement('legend');
        legend.append(title);
        this.root.appendChild(legend);

        /**
         * @param {string} label
         * @param {HTMLElement} elem
         */
        const appendField = (label, elem) => {
            const div = document.createElement('div');
            const lab = document.createElement('label');
            lab.append(label);
            div.append(lab, elem);
            this.root.appendChild(div);
        }

        /** @type {[OptionItem, () => any][]} */
        this.valueGetters = [];
        /** @type {{[name: string]: any}} */
        this.value = {};
        for (const key in initialValue) {
            this.value[key] = initialValue[key];
        }
        for (const opt of options) {
            const data = opt.data;
            switch (data.type) {
                case 'bool': {
                    const chk = document.createElement('input');
                    chk.type = 'checkbox';
                    chk.checked = initialValue[opt.key];
                    appendField(opt.description, chk);
                    chk.addEventListener('change', () => {
                        this.value[opt.key] = chk.checked;
                        onValueChange(opt.key, this.value);
                    });
                    this.valueGetters.push([opt, () => chk.checked]);
                    break;
                }
                case 'number': {
                    const input = document.createElement('input');
                    input.type = 'number';
                    if (data.max !== void 0) input.max = data.max.toString();
                    if (data.min !== void 0) input.min = data.min.toString();
                    if (data.step !== void 0) input.step = data.step.toString();
                    input.value = initialValue[opt.key].toString();
                    input.addEventListener('change', () => {
                        this.value[opt.key] = Number(input.value);
                        onValueChange(opt.key, this.value);
                    });
                    appendField(opt.description, input);
                    break;
                }
                case 'enum': {
                    const fs = document.createElement('fieldset');
                    {
                        const legend = document.createElement('legend');
                        legend.append(opt.description);
                        fs.appendChild(legend);
                    }
                    /** @type {HTMLButtonElement[]} */
                    const btns = [];
                    for (const [value, displayedValue] of data.candidates) {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.classList.add('radio');
                        btn.append(displayedValue);
                        if (value === initialValue[opt.key]) {
                            btn.classList.add('selected');
                        }
                        btn.addEventListener('click', ev => {
                            this.value[opt.key] = value;
                            onValueChange(opt.key, this.value);
                            for (const b of btns) {
                                b.classList.remove('selected');
                            }
                            btn.classList.add('selected');
                        });
                        btns.push(btn);
                        fs.appendChild(btn);
                    }
                    appendField(opt.description, fs);
                    break;
                }
            }
        }
    }
}
