/** @import {OrdinalEnumeratorConfig, OrdinalEnumeratorElementManager, Y0MontagneImageConfig} from './yseq.types.js' */
/** @import { Applet, LList } from './app.types.js' */

import { expandY0, y0Montagne } from "./0y.js";
import { renderNoteText } from "./texlite.js";
import { lexicographicalCompareNumbers } from "./utils.js";
import { generateY0Montagne } from "./yseqvis.js";

/**
 * @param {Node[]} elems
 */
function li(...elems) {
    const ret = document.createElement('li');
    ret.append(...elems);
    return ret;
}

/**
 * @template T
 */
export class OrdinalExpanderItem {
    /**
     * @param {T} ordinal
     * @param {OrdinalListExpander<T>} expander
     */
    constructor(ordinal, expander) {
        /** @type {OrdinalListExpander<T>} */
        this.expander = expander;
        /** @type {OrdinalExpanderItem<T> | undefined} */
        this.prev = void 1;
        /** @type {OrdinalExpanderItem<T> | undefined} */
        this.next = void 1;

        /** @type {HTMLLIElement} */
        this.root = document.createElement('li');
        /** @type {HTMLDivElement} */
        this.ordinalContainer = document.createElement('div');

        /** @type {HTMLDivElement} */
        this.noteContainer = document.createElement('div');

        /** @type {HTMLTextAreaElement} */
        this.noteEditor = document.createElement('textarea');

        /** @type {string} */
        this.note = '';

        this.root.append(this.ordinalContainer, this.noteContainer);

        this.root.addEventListener('click', () => {
            expander.select(this);
        });

        /** @type {OrdinalMenu<T>} */
        this.menu = new OrdinalMenu(this);

        /** @type {T} */
        this.ordinal = ordinal;
        /** @type {OrdinalEnumeratorElementManager<T>} */
        this.ordinalManager = expander.config.createElement(this);
    }
    renderOrdinal() {
        this.ordinalContainer.replaceChildren(this.ordinalManager.render(this.ordinal, false));
        if (this.menu.isShown()) {
            this.menu.renderExpansionCandidates();
        }
    }
    expandOne() {
        const expander = this.expander.config.expander(this.ordinal);
        if (expander === null) return;
        let expanded = expander();
        while (expanded !== null && this.prev !== void 0 && this.expander.config.compare(expanded, this.prev.ordinal) <= 0) {
            expanded = expander();
        }
        if (expanded === null) return;
        this.expander.insertBefore(this, new OrdinalExpanderItem(expanded, this.expander));
    }
    /**
     * @param {T[]} candidates
     * @param {number} count
     */
    fillInExpansionCandidates(candidates, count) {
        const minOrdinal = candidates.length > 0 ? candidates[candidates.length - 1] : this.prev !== void 0 ? this.prev.ordinal : void 0;
        const expander = this.expander.config.expander(this.ordinal);
        if (expander === null) return;
        let expanded = expander();
        while (expanded !== null && minOrdinal !== void 0 && this.expander.config.compare(expanded, minOrdinal) <= 0) {
            expanded = expander();
        }
        if (expanded === null) return;
        for (let i = 0; i < count; i++) {
            candidates.push(expanded);
            expanded = expander();
            if (expanded === null) return;
        }
    }
    /**
     * @param {string} txt
     */
    setNoteText(txt) {
        this.note = txt;
        this.noteContainer.replaceChildren(...renderNoteText(txt));
    }
    closeNoteEditor() {
        if (this.noteEditor.parentNode) {
            this.setNoteText(this.noteEditor.value);
            this.noteEditor.replaceWith(this.noteContainer);
        }
    }
    openNoteEditor() {
        if (this.noteContainer.parentNode) {
            this.noteEditor.value = this.note;
            this.noteContainer.replaceWith(this.noteEditor);
        }
    }
}

/**
 * @template T
 */
export class OrdinalMenu {
    /**
     * @param {OrdinalExpanderItem<T>} item
     */
    constructor(item) {
        /** @type {OrdinalExpanderItem<T>} */
        this.expanderItem = item;
        /** @type {HTMLOListElement} */
        this.expansionCadidatesList = document.createElement('ol');
        /** @type {HTMLDivElement} */
        this.root = document.createElement('div');
        /** @type {HTMLUListElement} */
        this.btns = document.createElement('ul');
        this.btns.className = 'small-menu';
        const btnExpand = document.createElement('button');
        btnExpand.type = 'button';
        btnExpand.textContent = '+';
        btnExpand.addEventListener('click', () => {
            this.expanderItem.expandOne();
        });

        /** @type {T[]} */
        this.expansionCadidates = [];
        /** @type {number} */
        this.expansionCadidateLength = 5;

        /** @type {HTMLButtonElement} */
        this.btnExpandCadidates = document.createElement('button');
        this.btnExpandCadidates.type = 'button';
        this.btnExpandCadidates.textContent = '+...';
        this.btnExpandCadidates.addEventListener('click', () => {
            this.expansionCadidates.length = 0;
            if (this.expansionCadidatesList.isConnected) {
                this.expansionCadidatesList.remove();
                this.btnExpandCadidates.classList.remove('selected');
            } else {
                this.expanderItem.fillInExpansionCandidates(this.expansionCadidates, this.expansionCadidateLength);
                this.renderExpansionCandidates();
                this.root.appendChild(this.expansionCadidatesList);
                this.btnExpandCadidates.classList.add('selected');
            }
        });

        const btnDelete = document.createElement('button');
        btnDelete.type = 'button';
        btnDelete.textContent = '-';
        btnDelete.addEventListener('click', () => {
            this.expanderItem.expander.remove(this.expanderItem);
        });

        const btnNote = document.createElement('button');
        btnNote.type = 'button';
        btnNote.textContent = 'N';
        btnNote.addEventListener('click', () => {
            if (btnNote.classList.toggle('selected')) {
                this.expanderItem.openNoteEditor();
            } else {
                this.expanderItem.closeNoteEditor();
            }
        });

        this.btns.append(li(btnExpand), li(this.btnExpandCadidates), li(btnDelete), li(btnNote));
        this.root.appendChild(this.btns);
    }
    hide() {
        this.root.remove();
    }
    show() {
        this.expanderItem.root.appendChild(this.root);
    }
    isShown() {
        return this.root.isConnected;
    }
    renderExpansionCandidates() {
        this.expansionCadidatesList.replaceChildren();
        for (const ord of this.expansionCadidates) {
            const elem = li(this.expanderItem.ordinalManager.render(ord, true));
            this.expansionCadidatesList.appendChild(elem);
        }
    }
}

/**
 * @template T
 * @implements {Applet}
 */
export class OrdinalListExpander {
    /**
     * @param {OrdinalEnumeratorConfig<T>} config
     */
    constructor(config) {
        /** @type {OrdinalEnumeratorConfig<T>} */
        this.config = config;

        /** @type {OrdinalExpanderItem<T> | undefined} */
        this._first = void 1;
        /** @type {OrdinalExpanderItem<T> | undefined} */
        this._last = void 1;
        /** @type {OrdinalExpanderItem<T> | undefined} */
        this._selected = void 1;

        /** @type {HTMLDivElement} */
        this.root = document.createElement('div');

        /** @type {HTMLOListElement} */
        this.mainContainer = document.createElement('ol');
        this.mainContainer.className = 'main';

        /** @type {HTMLInputElement} */
        this.ordinalInput = document.createElement('input');
        this.ordinalInput.type = 'text';
        this.ordinalInput.placeholder = 'Ordinal';

        /** @type {HTMLButtonElement} */
        this.btnAdd = document.createElement('button');
        this.btnAdd.type = 'button';
        this.btnAdd.textContent = 'Add';

        /** @type {HTMLOListElement} */
        this.expansionCadidatesList = document.createElement('ol');

        this.btnAdd.addEventListener('click', () => {
            const ord = config.parse(this.ordinalInput.value);
            if (ord !== null) {
                if (this._last === void 0 || config.compare(ord, this._last.ordinal) > 0) {
                    this.append(new OrdinalExpanderItem(ord, this));
                }
            }
        });

        this.root.append(this.mainContainer, this.ordinalInput, this.btnAdd);
    }
    /**
     * @param {any} data
     */
    serialize(data) {
        /** @type {any[]} */
        const ordinals = [];
        data.type = 'ordinal-enumerator';
        data.ordinalType = this.config.serialize();
        for (let h = this._first; h; h = h.next) {
            /** @type {any} */
            const ord = {ordinal: this.config.stringify(h.ordinal), note: h.note};
            h.ordinalManager.serialize(ord);
            ordinals.push(ord);
        }
        data.ordinals = ordinals;
    }
    /**
     * @param {any} data
     */
    loadData(data) {
        if (Array.isArray(data.ordinals)) {
            for (const ord of data.ordinals) {
                const ordinal = this.config.parse(ord.ordinal);
                if (ordinal !== null) {
                    const elem = new OrdinalExpanderItem(ordinal, this);
                    if (typeof ord.note === 'string' && ord.note.length > 0) {
                        elem.setNoteText(ord.note);
                    }
                    elem.ordinalManager.deserialize(ord);
                    this.append(elem);
                }
            }
        }
    }
    /**
     * @param {OrdinalExpanderItem<T>} item
     * @param {OrdinalExpanderItem<T>} newItem
     */
    insertBefore(item, newItem) {
        newItem.prev = item.prev;
        newItem.next = item;
        if (item.prev) {
            item.prev.next = newItem;
        }
        item.prev = newItem;
        if (item === this._first) {
            this._first = newItem;
        }
        this.mainContainer.insertBefore(newItem.root, item.root);
        newItem.renderOrdinal();
    }
    /**
     * @param {OrdinalExpanderItem<T>} item
     */
    append(item) {
        if (this._last) {
            this._last.next = item;
            item.prev = this._last;
            item.next = void 0;
            this._last = item;
        } else {
            this._first = this._last = item;
            item.prev = item.next = void 0;
        }
        this.mainContainer.appendChild(item.root);
        item.renderOrdinal();
    }
    /**
     * @param {OrdinalExpanderItem<T>} item
     */
    remove(item) {
        if (item === this._first) {
            this._first = this._first.next;
        }
        if (item === this._last) {
            this._last = this._last.prev;
        }
        if (item.prev) {
            item.prev.next = item.next;
        }
        if (item.next) {
            item.next.prev = item.prev;
        }
        item.root.remove();
    }
    /**
     * @param {OrdinalExpanderItem<T> | undefined} item
     */
    select(item) {
        if (this._selected && this._selected !== item) {
            this._selected.menu.hide();
        }
        if (item && this._selected !== item) {
            item.menu.show();
            this._selected = item;
        }
    }
}

/**
 * @param {any} data
 */
export function deserializeOrdinalExpander(data) {
    if (data.ordinalType === '0y') {
        const ret = new OrdinalListExpander(new Y0SequenceOrdinalListExpander());
        ret.loadData(data);
        return ret;
    }
    return null;
}

/**
 * @implements {OrdinalEnumeratorConfig<number[]>}
 * @implements {Y0MontagneImageConfig}
 */
export class Y0SequenceOrdinalListExpander {
    constructor() {
        /** @type {boolean} */
        this.showMontagne = true;
        this.elemGap = 40;
        this.linkCellHeight = 20;
        this.fontSize = 20;
        this.paddingLeftRight = 10;
    }
    serialize() {
        return '0y';
    }
    /**
     * @param {number[]} a
     */
    stringify(a) {
        return a.join(',');
    }
    /**
     * @param {OrdinalExpanderItem<number[]>} elem
     */
    createElement(elem) {
        return new Y0SequenceOrdinalListExpanderElementManager(this, elem);
    }
    /**
     * @param {number[]} a
     */
    predecessor(a) {
        if (a[a.length - 1] === 1) {
            return a.slice(0, -1);
        } else return null;
    }
    /**
     * @param {number[]} a
     * @param {number[]} b
     */
    compare(a, b) {
        return lexicographicalCompareNumbers(a, b);
    }
    /**
     * @param {number[]} ord
     */
    render(ord) {
        return document.createTextNode(ord.join(','));
    }
    /**
     * @param {number[]} a
     */
    expander(a) {
        return expandY0(y0Montagne(a));
    }
    /**
     * @param {string} str
     */
    parse(str) {
        return str.split(',').map(e => Number(e.trim()));
    }
}

/**
 * @param {string} text
 * @param {() => void} onclick
 */
function toggleButton(text, onclick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', function() {
        this.classList.toggle('selected');
        onclick();
    });
    return btn;
}

/**
 * @implements {OrdinalEnumeratorElementManager<number[]>}
 */
export class Y0SequenceOrdinalListExpanderElementManager {
    /**
     * @param {Y0MontagneImageConfig} imageConfig
     * @param {OrdinalExpanderItem<number[]>} elem
     */
    constructor(imageConfig, elem) {
        /** @type {Y0MontagneImageConfig} */
        this.imageConfig = imageConfig;
        /** @type {OrdinalExpanderItem<number[]>} */
        this.ordinalElem = elem;

        /** @type {HTMLButtonElement} */
        this.btnShowMontagne = toggleButton('M', () => elem.renderOrdinal());
        /** @type {HTMLButtonElement} */
        this.btnShowMontagneInCandidates = toggleButton('M...', () => elem.renderOrdinal());

        this.ordinalElem.menu.btns.append(li(this.btnShowMontagne), li(this.btnShowMontagneInCandidates));
    }
    /**
     * @param {any} data
     */
    serialize(data) {
        data.showM = this.btnShowMontagne.classList.contains('selected');
        data.showMInC = this.btnShowMontagneInCandidates.classList.contains('selected');
    }
    /**
     * @param {any} data
     */
    deserialize(data) {
        if (data.showM) {
            this.btnShowMontagne.classList.add('selected');
        } else {
            this.btnShowMontagne.classList.remove('selected');
        }
        if (data.showMInC) {
            this.btnShowMontagneInCandidates.classList.add('selected');
        } else {
            this.btnShowMontagneInCandidates.classList.remove('selected');
        }
    }
    /**
     * @param {number[]} ordinal
     * @param {boolean} isCandidates
     */
    render(ordinal, isCandidates) {
        if (!isCandidates && this.btnShowMontagne.classList.contains('selected') || isCandidates && this.btnShowMontagneInCandidates.classList.contains('selected')) {
            return generateY0Montagne(y0Montagne(ordinal), this.imageConfig);
        } else {
            return document.createTextNode(ordinal.join(','));
        }
    }
}
