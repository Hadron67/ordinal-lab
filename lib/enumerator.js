/** @import {OrdinalEnumeratorConfig, OrdinalEnumeratorElementManager, Y0MontagneImageConfig} from './types/ordinal' */
/** @import { Applet, AppletFactory, LList } from './types/app' */

import { expandY0, stringifyBMS, y0Montagne, y0ToBMS } from "./0y.js";
import { AppletEntry } from "./appmanager.js";
import { button, html, toggleButton, li, createTable } from "./domutils.js";
import { renderTexlite } from "./texlite.js";
import { lexicographicalCompareNumbers, RateLimiter } from "./utils.js";
import { generateY0Montagne } from "./yseqvis.js";

/**
 * @param {HTMLTextAreaElement} textarea
 * @param {string} txt
 */
function insertAtCursor(textarea, txt) {
    textarea.setRangeText(txt, textarea.selectionStart, textarea.selectionEnd, 'end');
}

/**
 * @param {HTMLTextAreaElement} textarea
 * @param {string} start
 * @param {string} end
 */
function insertPairAtCursor(textarea, start, end) {
    textarea.setRangeText(start, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.setRangeText(end, textarea.selectionStart, textarea.selectionEnd, 'start');
}

const INPUT_HELPERS = [
    '\\',
    '_',
    '^',
    '+',
    '=',
    '\\times',
    '\\chi',
    '\\epsilon',
    '\\psi',
    '\\omega',
    '\\Omega',
    '\\phi',
];

/**
 * @template T
 */
export class OrdinalExpanderItem {
    /**
     * @param {T} ordinal
     * @param {OrdinalListExpander<T>} expander
     * @param {(cela: OrdinalExpanderItem<T>) => OrdinalEnumeratorElementManager<T>} managerProvider
     */
    constructor(ordinal, expander, managerProvider) {
        /** @type {OrdinalListExpander<T>} */
        this.expander = expander;
        /** @type {OrdinalExpanderItem<T> | undefined} */
        this.prev = void 1;
        /** @type {OrdinalExpanderItem<T> | undefined} */
        this.next = void 1;

        /** @type {OrdinalExpanderItem<T> | null} */
        this.parent = null;

        /** @type {HTMLLIElement} */
        this.root = document.createElement('li');
        /** @type {HTMLDivElement} */
        this.ordinalContainer = document.createElement('div');
        this.ordinalContainer.classList.add('ordinal-container');

        /** @type {HTMLDivElement} */
        this.contentContainer = document.createElement('div');
        this.contentContainer.classList.add('ordinal-item');

        /** @type {number} */
        this.listLevel = 0;

        /** @type {HTMLOListElement | null} */
        this.sublist = null;

        /** @type {HTMLDivElement | null} */
        this.sublistContainer = null;

        /** @type {boolean} */
        this.isSublistShown = true;

        /** @type {HTMLDivElement} */
        this.noteContainer = document.createElement('div');
        this.noteContainer.classList.add('note');

        /** @type {HTMLTextAreaElement} */
        this.noteEditor = document.createElement('textarea');
        this.noteEditor.spellcheck = false;

        /** @type {HTMLUListElement} */
        this.inputHelpers = document.createElement('ul');
        this.inputHelpers.className = 'small-menu';
        {
            for (const cmd of INPUT_HELPERS) {
                const btn = document.createElement('button');
                btn.type = 'button';
                if (cmd[0] === '\\' && cmd.length > 1) {
                    btn.append(...renderTexlite(cmd));
                } else {
                    btn.append(cmd);
                }
                btn.addEventListener('click', () => {
                    insertAtCursor(this.noteEditor, cmd);
                    this.setNoteText(this.noteEditor.value);
                    this.noteEditor.focus({preventScroll: true});
                });
                this.inputHelpers.appendChild(li(btn));
            }
            this.inputHelpers.append(button('()', () => {
                insertPairAtCursor(this.noteEditor, '(', ')');
                this.setNoteText(this.noteEditor.value);
                this.noteEditor.focus({preventScroll: true});
            }), button('{}', () => {
                insertPairAtCursor(this.noteEditor, '{', '}');
                this.setNoteText(this.noteEditor.value);
                this.noteEditor.focus({preventScroll: true});
            }));
        }

        /** @type {string} */
        this.note = '';

        this.contentContainer.append(this.ordinalContainer, this.noteContainer);
        this.root.append(this.contentContainer);

        this.contentContainer.addEventListener('click', () => {
            expander.select(this);
        });

        /** @type {OrdinalMenu<T>} */
        this.menu = new OrdinalMenu(this);

        /** @type {T} */
        this.ordinal = ordinal;
        /** @type {OrdinalEnumeratorElementManager<T>} */
        this.ordinalManager = managerProvider(this);

        /** @type {BookmarkItem<T> | null} */
        this.bookmarkItem = null;

        const noteUpdateLimiter = new RateLimiter(100);
        this.noteEditor.addEventListener('input', () => {
            noteUpdateLimiter.run(() => {
                this.setNoteText(this.noteEditor.value);
            });
        });
        const rerender = () => this.renderNote();
        this.noteEditor.addEventListener('selectionchange', rerender);
        this.noteEditor.addEventListener('focus', rerender);
        this.noteEditor.addEventListener('blur', rerender);
    }
    renderOrdinal() {
        this.ordinalContainer.replaceChildren(this.ordinalManager.render(this.ordinal, false));
        if (this.menu.isShown()) {
            this.menu.renderExpansionCandidates();
        }
    }
    /**
     * @param {T} ord
     */
    newExpanderItem(ord) {
        const ret = new OrdinalExpanderItem(ord, this.expander, item => this.ordinalManager.createElement(item));
        ret.listLevel = this.listLevel;
        return ret;
    }
    expandOne() {
        const expander = this.expander.config.expander(this.ordinal);
        if (expander === null) return null;
        let expanded = expander();
        while (expanded !== null && this.prev !== void 0 && this.expander.config.compare(expanded, this.prev.ordinal) <= 0) {
            expanded = expander();
        }
        if (expanded === null) return null;
        const ret = this.newExpanderItem(expanded);
        this.expander.insertBefore(this, ret);
        return ret;
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
        this.renderNote();
        if (this.bookmarkItem) {
            this.bookmarkItem.update();
        }
    }
    renderNote() {
        if (document.activeElement === this.noteEditor) {
            if (this.note.length > 0) {
                const pos = [this.noteEditor.selectionStart];
                const pos2 = this.noteEditor.selectionEnd;
                if (pos2 > pos[0] + 1) {
                    pos.push(pos2);
                }
                this.noteContainer.replaceChildren(...renderTexlite(this.note, pos));
            } else {
                this.noteContainer.replaceChildren();
            }
        } else {
            this.noteContainer.replaceChildren(...renderTexlite(this.note));
        }
    }
    closeNoteEditor() {
        if (this.noteEditor.parentNode) {
            this.setNoteText(this.noteEditor.value);
            this.noteEditor.replaceWith(this.noteContainer);
            this.noteEditor.remove();
            if (this.inputHelpers.parentNode) {
                this.inputHelpers.remove();
            }
        }
    }
    openNoteEditor() {
        if (!this.noteEditor.parentNode) {
            this.noteEditor.value = this.note;
            this.noteContainer.insertAdjacentElement('afterend', this.noteEditor);
            if (this.expander.btnEnableInputHelper.classList.contains('selected')) {
                this.noteEditor.insertAdjacentElement('afterend', this.inputHelpers);
            }
        }
    }
    remove() {
        if (!this.prev || this.prev.listLevel < this.listLevel) {
            for (let node = this.next; node && node.listLevel > this.listLevel; node = node.next) {
                node.listLevel--;
            }
        }
        this.expander.bookmarks.remove(this);
        this.root.remove();
        const next = this.next;
        this.expander.removeLinks(this);
        this.parent?._checkEmptySublist();
        if (next) {
            next.refreshAllListLevels();
        }
    }
    prepareSublist() {
        if (this.sublist === null) {
            this.sublistContainer = document.createElement('div');
            this.sublistContainer.className = 'sublist-container';
            this.sublist = document.createElement('ol');
            const sublistBtnContainer = document.createElement('div');
            const sublistBtn = button('+', () => {
                if (this.sublist && this.sublistContainer) {
                    if (this.isSublistShown) {
                        sublistBtn.classList.remove('selected');
                        sublistBtn.textContent = '+';
                        this.sublist.remove();
                    } else {
                        sublistBtn.classList.add('selected');
                        sublistBtn.textContent = '-';
                        this.sublistContainer.appendChild(this.sublist);
                    }
                    this.isSublistShown = !this.isSublistShown;
                }
            });
            sublistBtn.classList.add('sublist-control');
            sublistBtn.title = 'Expand/collapse sublist';
            sublistBtnContainer.appendChild(sublistBtn);
            this.sublistContainer.appendChild(sublistBtnContainer);
            this.root.append(this.sublistContainer);
            if (this.isSublistShown) {
                sublistBtn.classList.add('selected');
                sublistBtn.textContent = '-';
                this.sublistContainer.appendChild(this.sublist);
            }
            return this.sublist;
        } else {
            return this.sublist;
        }
    }
    /** @private */
    _checkEmptySublist() {
        if (this.sublistContainer && this.sublist && this.sublist.children.length === 0) {
            this.sublistContainer.remove();
            this.sublist.remove();
            this.sublist = null;
            this.sublistContainer = null;
            this.isSublistShown = true;
        }
    }
    /**
     * @private
     * @param {OrdinalExpanderItem<T> | null} prev
     */
    _insertToDom(prev) {
        const container = this.parent ? this.parent.prepareSublist() : this.expander.mainContainer;
        if (prev) {
            prev.root.insertAdjacentElement('afterend', this.root);
        } else {
            container.prepend(this.root);
        }
    }
    refreshListLevel() {
        /** @type {OrdinalExpanderItem<T> | null} */
        let newPrev = null;
        /** @type {OrdinalExpanderItem<T> | null} */
        let newParent = null;
        for (let node = this.prev; node; node = node.prev) {
            if (newPrev === null && node.listLevel === this.listLevel) {
                newPrev = node;
            }
            if (node.listLevel + 1 === this.listLevel) {
                newParent = node;
                break;
            }
        }
        if (!this.root.parentElement) {
            this.parent = newParent;
            this._insertToDom(newPrev);
            return true;
        } else if (newParent !== this.parent) {
            this.root.remove();
            this.parent?._checkEmptySublist();
            this.parent = newParent;
            this._insertToDom(newPrev);
            return true;
        }
        return false;
    }
    refreshAllListLevels() {
        this.refreshListLevel();
        for (let node = this.next; node && node.refreshListLevel(); node = node.next) {}
    }
    canIncreaseListLevel() {
        return this.prev && this.prev.listLevel >= this.listLevel;
    }
    canDecreaseListLevel() {
        return this.listLevel > 0 && (this.next === void 0 || this.next.listLevel <= this.listLevel);
    }
    /**
     * @param {1 | -1} delta
     * @param {boolean} recursive
     */
    changeListLevel(delta, recursive) {
        const oldLevel = this.listLevel;
        let lastToUpdate = this.next;
        const tlevel = delta > 0 ? this.listLevel : this.listLevel + delta;
        for (; lastToUpdate && lastToUpdate.listLevel > tlevel; lastToUpdate = lastToUpdate.next) {}
        this.listLevel += delta;
        for (let node = this.next; node && node.listLevel > oldLevel; node = node.next) {
            if (recursive) {
                node.listLevel += delta;
            }
        }
        this.refreshListLevel();
        for (let node = this.next; node && node !== lastToUpdate; node = node.next) {
            node.refreshListLevel();
        }
    }
    /**
     * @param {any} data
     */
    serialize(data) {
        data.ordinal = this.expander.config.stringify(this.ordinal);
        data.note = this.note;
        data.bookmark = this.bookmarkItem !== null;
        data.listLevel = this.listLevel;
        data.showSublist = this.isSublistShown;
        this.ordinalManager.serialize(data);
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
        this.expansionCadidatesList.className = 'ordinal-candidates';
        /** @type {HTMLDivElement} */
        this.root = document.createElement('div');
        /** @type {HTMLUListElement} */
        this.btns = document.createElement('ul');
        this.btns.className = 'small-menu';
        /** @private @type {HTMLElement[]} */
        this._hiddenBtns = [];
        const btnExpand = button('+', () => this.expanderItem.expandOne());
        btnExpand.title = 'Expand';
        const btnRecursiveExpand = button('++', () => {
            /** @type {OrdinalExpanderItem<T> | null} */
            let node = this.expanderItem;
            while (node = node.expandOne());
        });
        btnRecursiveExpand.title = 'Expand recursively';

        /** @type {T[]} */
        this.expansionCadidates = [];
        /** @type {number} */
        this.expansionCadidateLength = 5;

        /** @type {HTMLButtonElement} */
        this.btnExpandCadidates = button('FS', () => {
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
        this.btnExpandCadidates.title = 'Fundamental sequence';

        const btnDelete = document.createElement('button');
        btnDelete.type = 'button';
        btnDelete.textContent = '-';
        btnDelete.addEventListener('click', () => {
            this.expanderItem.remove();
        });
        btnDelete.title = 'Delete';

        const btnNote = button('N', () => {
            if (btnNote.classList.toggle('selected')) {
                this.expanderItem.openNoteEditor();
            } else {
                this.expanderItem.closeNoteEditor();
            }
        });
        btnNote.title = 'Edit note';

        /** @type {HTMLButtonElement} */
        this.btnBookmark = button('B', () => {
            if (this.expanderItem.bookmarkItem) {
                this.expanderItem.expander.bookmarks.remove(this.expanderItem);
            } else {
                this.expanderItem.expander.bookmarks.add(this.expanderItem);
            }
        });
        this.btnBookmark.title = 'Bookmark';

        const btnIncreaseList = button('>', () => {
            if (this.expanderItem.canIncreaseListLevel()) {
                this.expanderItem.changeListLevel(1, false);
            }
        });
        btnIncreaseList.title = 'Increase list level';
        const btnIncreaseListRec = button('>>', () => {
            if (this.expanderItem.canIncreaseListLevel()) {
                this.expanderItem.changeListLevel(1, true);
            }
        });
        btnIncreaseListRec.title = 'Increase list level recursively';
        const btnDecreaseList = button('<', () => {
            if (this.expanderItem.listLevel > 0) {
                this.expanderItem.changeListLevel(-1, true);
            }
        });
        btnDecreaseList.title = 'Decrease list level';

        /** @type {HTMLButtonElement} */
        this.btnMore = button('...', () => {
            if (this.isMoreButtonsShown()) {
                this.hideMoreButtons();
                this.expanderItem.expander.menuShowingMoreButtons = false;
            } else {
                this.showMoreButtons();
                this.expanderItem.expander.menuShowingMoreButtons = true;
            }
        });
        this.btnMore.title = 'More options';

        this.btns.append(
            li(btnExpand),
            li(btnRecursiveExpand),
            li(btnDelete),
            li(btnNote),
            li(this.btnMore),
        );
        this._hiddenBtns.push(
            li(this.btnExpandCadidates),
            li(btnIncreaseList),
            li(btnIncreaseListRec),
            li(btnDecreaseList),
            li(this.btnBookmark),
        );
        this.root.appendChild(this.btns);
    }
    hide() {
        this.root.remove();
    }
    show() {
        this.expanderItem.contentContainer.appendChild(this.root);
        if (this.expanderItem.expander.menuShowingMoreButtons) {
            this.showMoreButtons();
        } else {
            this.hideMoreButtons();
        }
    }
    isShown() {
        return this.root.isConnected;
    }
    renderExpansionCandidates() {
        this.expansionCadidatesList.replaceChildren();
        for (const ord of this.expansionCadidates) {
            const elem = li(this.expanderItem.ordinalManager.render(ord, true));
            elem.className = 'ordinal-container';
            this.expansionCadidatesList.appendChild(elem);
        }
    }
    showMoreButtons() {
        this.btns.append(...this._hiddenBtns);
        this.btnMore.classList.add('selected');
    }
    hideMoreButtons() {
        for (const elem of this._hiddenBtns) {
            elem.remove();
        }
        this.btnMore.classList.remove('selected');
    }
    isMoreButtonsShown() {
        return this._hiddenBtns[0].parentElement !== null;
    }
    /**
     * @param {Node[]} btn
     */
    addExtraButton(...btn) {
        this._hiddenBtns.push(...btn.map(e => li(e)));
    }
}

/** @template T */
class BookmarkItem {
    /**
     * @param {OrdinalExpanderItem<T>} target
     */
    constructor(target) {
        /** @type {HTMLLIElement} */
        this.root = document.createElement('li');
        /** @type {HTMLDivElement} */
        this.ordinalContainer = document.createElement('div');
        /** @type {HTMLDivElement} */
        this.note = document.createElement('div');
        this.root.append(this.ordinalContainer, this.note);

        this.root.addEventListener('click', () => this.target.root.scrollIntoView());

        /** @type {OrdinalExpanderItem<T>} */
        this.target = target;
    }
    /**
     * @param {OrdinalExpanderItem<T>} target
     */
    setTarget(target) {
        this.target = target;
        this.update();
    }
    update() {
        if (this.target) {
            this.note.replaceChildren(...renderTexlite(this.target.note));
            this.ordinalContainer.replaceChildren(this.target.expander.config.render(this.target.ordinal));
        }
    }
}

/** @template T */
export class BookmarkContainer {
    /**
     * @param {OrdinalListExpander<T>} expander
     */
    constructor(expander) {
        /** @type {OrdinalListExpander<T>} */
        this.expander = expander;
        /** @type {HTMLUListElement} */
        this.root = document.createElement('ul');
        this.root.className = 'bookmarks';
        /** @type {BookmarkItem<T>[]} */
        this.bookmarks = [];
    }
    /**
     * @param {OrdinalExpanderItem<T>} item
     */
    add(item) {
        if (item.bookmarkItem === null) {
            const bm = new BookmarkItem(item);
            /** @type {BookmarkItem<T> | null} */
            let nextBookmark = null;
            for (let next = item.next; next; next = next.next) {
                if (next.bookmarkItem) {
                    nextBookmark = next.bookmarkItem;
                    break;
                }
            }
            this.root.insertBefore(bm.root, nextBookmark?.root ?? null);
            item.bookmarkItem = bm;
            item.contentContainer.classList.add('selected');
            item.menu.btnBookmark.classList.add('selected');
            bm.update();
        }
    }
    /**
     * @param {OrdinalExpanderItem<T>} item
     */
    remove(item) {
        if (item.bookmarkItem) {
            this.bookmarks = this.bookmarks.filter(b => b !== item.bookmarkItem);
            item.bookmarkItem.root.remove();
            item.contentContainer.classList.remove('selected');
            item.menu.btnBookmark.classList.remove('selected');
            item.bookmarkItem = null;
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
        this.btnAdd = button('Add', () => {
            const ord = config.parse(this.ordinalInput.value);
            if (ord !== null) {
                if (this._last === void 0 || config.compare(ord, this._last.ordinal) > 0) {
                    this.append(new OrdinalExpanderItem(ord, this, item => this.config.createElement(item)));
                }
            }
        });

        /** @type {boolean} */
        this.menuShowingMoreButtons = false;

        /** @type {HTMLOListElement} */
        this.expansionCadidatesList = document.createElement('ol');

        /** @type {BookmarkContainer<T>} */
        this.bookmarks = new BookmarkContainer(this);

        const controls = document.createElement('div');
        controls.append(this.ordinalInput, this.btnAdd);
        controls.className = 'small-menu';

        this.btnEnableInputHelper = toggleButton('Input helpers');

        this.root.append(this.mainContainer, controls);
    }
    /**
     * @param {AppletEntry} applet
     */
    onCreate(applet) {
        const entry = applet.entry;
        if (entry && entry.tabHeader) {
            this.tabEntry = entry;
            const div = html('div', this.btnEnableInputHelper);
            div.className = 'app-menu-row';
            entry.tabHeader.append(div, this.bookmarks.root);
        }
    }
    getRoot() {
        return this.root;
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
            const ord = {};
            // const ord = {ordinal: this.config.stringify(h.ordinal), note: h.note, bookmark: h.bookmarkItem !== null};
            h.ordinalManager.serialize(ord);
            h.serialize(ord);
            ordinals.push(ord);
        }
        data.ordinals = ordinals;
        data.enableInputHelper = this.btnEnableInputHelper.classList.contains('selected');
    }
    /**
     * @param {any} data
     */
    loadData(data) {
        if (Array.isArray(data.ordinals)) {
            for (const ord of data.ordinals) {
                const ordinal = this.config.parse(ord.ordinal);
                if (ordinal !== null) {
                    const elem = new OrdinalExpanderItem(ordinal, this, item => this.config.createElement(item));
                    if (typeof ord.note === 'string' && ord.note.length > 0) {
                        elem.setNoteText(ord.note);
                    }
                    if (typeof ord.listLevel === 'number') {
                        elem.listLevel = ord.listLevel;
                    }
                    if (ord.showSublist === false) {
                        elem.isSublistShown = false;
                    }
                    elem.ordinalManager.deserialize(ord);
                    this.append(elem);
                    if (ord.bookmark) {
                        this.bookmarks.add(elem);
                    }
                }
            }
        }
        if (data.enableInputHelper) {
            this.btnEnableInputHelper.classList.add('selected');
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
        newItem.refreshListLevel();
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
        item.refreshListLevel();
        item.renderOrdinal();
    }
    /**
     * @param {OrdinalExpanderItem<T>} item
     */
    removeLinks(item) {
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

/** @type {AppletFactory} */
export const enumeratorFactory = {
    deserialize(data) {
        if (data.ordinalType === '0y') {
            const ret = new OrdinalListExpander(new Y0SequenceOrdinalListExpander());
            ret.loadData(data);
            return ret;
        }
        return null;
    },
    deserializeType(data) {
        if (data.ordinalType === '0y') {
            return '0-Y/BMS enumerator';
        }
        return null;
    }
};

export class Y0DisplayConfig {
    constructor() {

    }
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
 * @param {DOMTokenList} to
 * @param {DOMTokenList} from
 * @param {string} cls
 */
function copyClass(to, from, cls) {
    to.toggle(cls, from.contains(cls));
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
        this.btnShowOy = toggleButton('0-Y', () => elem.renderOrdinal());
        this.btnShowOy.title = 'Show 0-Y';
        /** @type {HTMLButtonElement} */
        this.btnShowMontagne = toggleButton('M', () => elem.renderOrdinal());
        this.btnShowMontagne.title = 'Show 0-Y montain';
        /** @type {HTMLButtonElement} */
        this.btnShowBMS = toggleButton('BMS', () => elem.renderOrdinal());
        this.btnShowBMS.title = 'Show BMS';
        /** @type {HTMLButtonElement} */
        this.btnShowBMSMatrix = toggleButton('BMS Mat', () => elem.renderOrdinal());
        this.btnShowBMSMatrix.title = 'Show BMS matrix form';

        this.btnShowOy.classList.add('selected');

        this.ordinalElem.menu.addExtraButton(
            this.btnShowOy,
            this.btnShowMontagne,
            this.btnShowBMS,
            this.btnShowBMSMatrix,
        );
    }
    /**
     * @param {OrdinalExpanderItem<number[]>} elem
     */
    createElement(elem) {
        const ret = new Y0SequenceOrdinalListExpanderElementManager(this.imageConfig, elem);
        copyClass(ret.btnShowOy.classList, this.btnShowOy.classList, 'selected');
        copyClass(ret.btnShowBMS.classList, this.btnShowBMS.classList, 'selected');
        copyClass(ret.btnShowBMSMatrix.classList, this.btnShowBMSMatrix.classList, 'selected');
        copyClass(ret.btnShowMontagne.classList, this.btnShowMontagne.classList, 'selected');
        return ret;
    }
    /**
     * @param {any} data
     */
    serialize(data) {
        data.showM = this.btnShowMontagne.classList.contains('selected');
        data.show0y = this.btnShowOy.classList.contains('selected');
        data.showBMS = this.btnShowBMS.classList.contains('selected');
        data.showBMSMat = this.btnShowBMSMatrix.classList.contains('selected');
    }
    /**
     * @param {any} data
     */
    deserialize(data) {
        this.btnShowMontagne.classList.toggle('selected', !!data.showM);
        this.btnShowOy.classList.toggle('selected', !!data.show0y);
        this.btnShowBMS.classList.toggle('selected', !!data.showBMS);
        this.btnShowBMSMatrix.classList.toggle('selected', !!data.showBMSMat);
    }
    /**
     * @param {number[]} ordinal
     * @param {boolean} isCandidates
     */
    render(ordinal, isCandidates) {
        /** @type {Node[]} */
        const renderedOrdinals = [];
        if (this.btnShowOy.classList.contains('selected')) {
            renderedOrdinals.push(document.createTextNode(ordinal.join(',')));
        }
        if (this.btnShowMontagne.classList.contains('selected')) {
            renderedOrdinals.push(generateY0Montagne(y0Montagne(ordinal), this.imageConfig));
        }
        if (this.btnShowBMS.classList.contains('selected') || this.btnShowBMSMatrix.classList.contains('selected')) {
            const bms = y0ToBMS(y0Montagne(ordinal));
            if (this.btnShowBMS.classList.contains('selected')) {
                renderedOrdinals.push(document.createTextNode(stringifyBMS(bms)));
            }
            if (this.btnShowBMSMatrix.classList.contains('selected')) {
                const tb = createTable(bms, elem => html('td', elem.toString()));
                tb.className = 'matrix';
                renderedOrdinals.push(tb);
            }
        }
        if (renderedOrdinals.length > 1) {
            const ul = document.createElement('ul');
            for (const elem of renderedOrdinals) {
                ul.appendChild(li(elem));
            }
            return ul;
        } else if (renderedOrdinals.length === 1) {
            return renderedOrdinals[0];
        } else {
            const ret = html('span', '[No display selected]');
            ret.className = 'untitled';
            return ret;
        }
    }
}
