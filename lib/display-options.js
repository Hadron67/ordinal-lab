/** @import { OptionItem } from './app' */

export class OptionsPanel {
    /**
     * @param {string} title
     * @param {OptionItem[]} options
     * @param {any} initialValue
     * @param {(key: string, value: any) => void} onValueChange
     */
    constructor(title, options, initialValue, onValueChange) {
        /** @type {HTMLUListElement} */
        this.root = document.createElement('ul');
        this.root.classList.add('settings');

        /**
         * @param {(HTMLElement | string)[]} elem
         */
        const appendField = (...elem) => {
            const li = document.createElement('li');
            li.append(...elem);
            this.root.appendChild(li);
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
                    const btnChk = document.createElement('button');
                    btnChk.type = 'button';
                    btnChk.append(opt.description);
                    btnChk.addEventListener('click', ev => {
                        this.value[opt.key] = !this.value[opt.key];
                        if (this.value[opt.key]) {
                            btnChk.classList.add('selected');
                        } else {
                            btnChk.classList.remove('selected');
                        }
                        onValueChange(opt.key, this.value);
                    });
                    if (this.value[opt.key]) {
                        btnChk.classList.add('selected');
                    }
                    appendField(btnChk);
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
                    appendField(input);
                    break;
                }
                case 'enum': {
                    const fs = document.createElement('ul');
                    {
                        const li = document.createElement('li');
                        li.classList.add('label');
                        li.append(opt.description);
                        fs.appendChild(li);
                    }
                    /** @type {HTMLButtonElement[]} */
                    const btns = [];
                    for (const [value, displayedValue] of data.candidates) {
                        const btn = document.createElement('button');
                        btn.type = 'button';
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
                        const li = document.createElement('li');
                        li.appendChild(btn);
                        fs.appendChild(li);
                    }
                    appendField(fs);
                    break;
                }
            }
        }
    }
}
