/** @import {OrdinalEnumeratorConfig, OrdinalEnumeratorElementManager, Y0MontagneImageConfig} from './types/ordinal' */
/** @import { Applet, AppletFactory, LList } from './types/app' */

import { expandY0, stringifyBMS, y0Montagne, y0ToBMS } from "./0y.js";
import { AppletEntry } from "./appmanager.js";
import { button, html, toggleButton, li, createTable } from "./domutils.js";
import { renderTexlite } from "./texlite.js";
import { Applet, AppletFactory } from "./types/app.js";
import { OrdinalEnumeratorConfig, OrdinalEnumeratorElementManager, Y0MontagneImageConfig } from "./types/ordinal.js";
import { lexicographicalCompareNumbers, RateLimiter } from "./utils.js";
import { generateY0Montagne } from "./yseqvis.js";

function insertAtCursor(textarea: HTMLTextAreaElement, txt: string) {
    textarea.setRangeText(txt, textarea.selectionStart, textarea.selectionEnd, 'end');
}

function insertPairAtCursor(textarea: HTMLTextAreaElement, start: string, end: string) {
    textarea.setRangeText(start, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.setRangeText(end, textarea.selectionStart, textarea.selectionEnd, 'start');
}

const INPUT_HELPERS = [
    '\\',
    '_',
    '^',
    '+',
    '-',
    '=',
    '\\aft',
    '\\times',
    '\\chi',
    '\\epsilon',
    '\\psi',
    '\\omega',
    '\\Omega',
    '\\phi',
];

export class OrdinalExpanderItem<T> {
    parent: OrdinalExpanderItem<T> | null = null;
    prev: OrdinalExpanderItem<T> | null = null;
    next: OrdinalExpanderItem<T> | null = null;
    root = document.createElement('li');
    ordinalContainer = document.createElement('div');
    contentContainer = document.createElement('div');
    noteContainer = document.createElement('div');
    noteEditor = document.createElement('textarea');
    inputHelpers = document.createElement('ul');
    menu = new OrdinalMenu(this);
    listLevel: number = 0;
    sublist: HTMLOListElement | null = null;
    sublistContainer: HTMLDivElement | null = null;
    isSublistShown: boolean = true;
    note: string = '';
    ordinalManager: OrdinalEnumeratorElementManager<T>;
    bookmarkItem: BookmarkItem<T> | null = null;
    constructor(
        public readonly ordinal: T,
        public readonly expander: OrdinalListExpander<T>,
        public readonly managerProvider: (cela: OrdinalExpanderItem<T>) => OrdinalEnumeratorElementManager<T>,
    ) {
        this.ordinalContainer.classList.add('ordinal-container');
        this.contentContainer.classList.add('ordinal-item');
        this.noteContainer.classList.add('note');
        this.noteEditor.spellcheck = false;
        this.inputHelpers.className = 'small-menu';
        this.contentContainer.append(this.ordinalContainer, this.noteContainer);
        this.root.append(this.contentContainer);

        this.contentContainer.addEventListener('click', () => {
            expander.select(this);
        });
        this.ordinalManager = managerProvider(this);

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

        {
            for (const cmd of INPUT_HELPERS) {
                const btn = document.createElement('button');
                btn.type = 'button';
                if (cmd[0] === '\\' && cmd.length > 1) {
                    btn.append(...renderTexlite(cmd, []));
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
    }
    renderOrdinal() {
        this.ordinalContainer.replaceChildren(this.ordinalManager.render(this.ordinal, false));
        if (this.menu.isShown()) {
            this.menu.renderExpansionCandidates();
        }
    }
    newExpanderItem(ord: T) {
        const ret = new OrdinalExpanderItem(ord, this.expander, item => this.ordinalManager.createElement(item));
        ret.listLevel = this.listLevel;
        return ret;
    }
    expandOne() {
        const expander = this.expander.config.expander(this.ordinal);
        if (expander === null) return null;
        let expanded = expander();
        while (expanded !== null && this.prev !== null && this.expander.config.compare(expanded, this.prev.ordinal) <= 0) {
            expanded = expander();
        }
        if (expanded === null) return null;
        const ret = this.newExpanderItem(expanded);
        this.expander.insertBefore(this, ret);
        return ret;
    }
    fillInExpansionCandidates(candidates: T[], count: number) {
        const minOrdinal = candidates.length > 0 ? candidates[candidates.length - 1] : this.prev !== null ? this.prev.ordinal : null;
        const expander = this.expander.config.expander(this.ordinal);
        if (expander === null) return;
        let expanded = expander();
        while (expanded !== null && minOrdinal !== null && this.expander.config.compare(expanded, minOrdinal) <= 0) {
            expanded = expander();
        }
        if (expanded === null) return;
        for (let i = 0; i < count; i++) {
            candidates.push(expanded);
            expanded = expander();
            if (expanded === null) return;
        }
    }
    setNoteText(txt: string) {
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
            this.noteContainer.replaceChildren(...renderTexlite(this.note, []));
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
    private _checkEmptySublist() {
        if (this.sublistContainer && this.sublist && this.sublist.children.length === 0) {
            this.sublistContainer.remove();
            this.sublist.remove();
            this.sublist = null;
            this.sublistContainer = null;
            this.isSublistShown = true;
        }
    }
    _insertToDom(prev: OrdinalExpanderItem<T> | null) {
        const container = this.parent ? this.parent.prepareSublist() : this.expander.mainContainer;
        if (prev) {
            prev.root.insertAdjacentElement('afterend', this.root);
        } else {
            container.prepend(this.root);
        }
    }
    refreshListLevel() {
        let newPrev: OrdinalExpanderItem<T> | null = null;
        let newParent: OrdinalExpanderItem<T> | null = null;
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
        return this.listLevel > 0 && (this.next === null || this.next.listLevel <= this.listLevel);
    }
    changeListLevel(delta: 1 | -1, recursive: boolean) {
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
    serialize(data: any) {
        data.ordinal = this.expander.config.stringify(this.ordinal);
        data.note = this.note;
        data.bookmark = this.bookmarkItem !== null;
        data.listLevel = this.listLevel;
        data.showSublist = this.isSublistShown;
        this.ordinalManager.serialize(data);
    }
}

export class OrdinalMenu<T> {
    root = document.createElement('div');
    expansionCadidatesList = document.createElement('ol');
    btns = document.createElement('ul');
    _hiddenBtns: HTMLElement[] = [];
    expansionCadidates: T[] = [];
    expansionCadidateLength = 5;
    btnExpandCadidates = button('FS', () => {
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
    btnBookmark = button('B', () => {
        if (this.expanderItem.bookmarkItem) {
            this.expanderItem.expander.bookmarks.remove(this.expanderItem);
        } else {
            this.expanderItem.expander.bookmarks.add(this.expanderItem);
        }
    });
    btnMore = button('...', () => {
        if (this.isMoreButtonsShown()) {
            this.hideMoreButtons();
            this.expanderItem.expander.menuShowingMoreButtons = false;
        } else {
            this.showMoreButtons();
            this.expanderItem.expander.menuShowingMoreButtons = true;
        }
    });
    constructor(public expanderItem: OrdinalExpanderItem<T>) {
        this.expansionCadidatesList.className = 'ordinal-candidates';
        this.btns.className = 'small-menu';
        const btnExpand = button('+', () => this.expanderItem.expandOne());
        btnExpand.title = 'Expand';
        const btnRecursiveExpand = button('++', () => {
            let node: OrdinalExpanderItem<T> | null = this.expanderItem;
            while (node = node.expandOne());
        });
        btnRecursiveExpand.title = 'Expand recursively';
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
    addExtraButton(...btn: Node[]) {
        this._hiddenBtns.push(...btn.map(e => li(e)));
    }
}

class BookmarkItem<T> {
    root = document.createElement('li');
    ordinalContainer = document.createElement('div');
    note = document.createElement('div');
    constructor(public target: OrdinalExpanderItem<T>) {
        this.root.append(this.ordinalContainer, this.note);
        this.root.addEventListener('click', () => this.target.root.scrollIntoView());
    }
    setTarget(target: OrdinalExpanderItem<T>) {
        this.target = target;
        this.update();
    }
    update() {
        if (this.target) {
            this.note.replaceChildren(...renderTexlite(this.target.note, []));
            this.ordinalContainer.replaceChildren(this.target.expander.config.render(this.target.ordinal));
        }
    }
}

export class BookmarkContainer<T> {
    root = document.createElement('ul');
    bookmarks: BookmarkItem<T>[] = [];
    constructor(public expander: OrdinalListExpander<T>) {
        this.root.className = 'bookmarks';
    }
    add(item: OrdinalExpanderItem<T>) {
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
    remove(item: OrdinalExpanderItem<T>) {
        if (item.bookmarkItem) {
            this.bookmarks = this.bookmarks.filter(b => b !== item.bookmarkItem);
            item.bookmarkItem.root.remove();
            item.contentContainer.classList.remove('selected');
            item.menu.btnBookmark.classList.remove('selected');
            item.bookmarkItem = null;
        }
    }
}

export class OrdinalListExpander<T> implements Applet {
    _first: OrdinalExpanderItem<T> | null = null;
    _last: OrdinalExpanderItem<T> | null = null;
    _selected: OrdinalExpanderItem<T> | null = null;
    root = document.createElement('div');
    mainContainer = document.createElement('ol');
    ordinalInput = document.createElement('input');
    expansionCadidatesList = document.createElement('ol');
    btnEnableInputHelper = toggleButton('Input helpers', () => void 0);
    bookmarks = new BookmarkContainer(this);
    btnAdd: HTMLButtonElement;
    menuShowingMoreButtons = false;
    constructor(public config: OrdinalEnumeratorConfig<T>) {
        this.mainContainer.className = 'main';

        this.ordinalInput.type = 'text';
        this.ordinalInput.placeholder = 'Ordinal';

        this.btnAdd = button('Add', () => {
            const ord = config.parse(this.ordinalInput.value);
            if (ord !== null) {
                if (this._last === null || config.compare(ord, this._last.ordinal) > 0) {
                    this.append(new OrdinalExpanderItem(ord, this, item => this.config.createElement(item)));
                }
            }
        });

        const controls = document.createElement('div');
        controls.append(this.ordinalInput, this.btnAdd);
        controls.className = 'small-menu';

        this.root.append(this.mainContainer, controls);
    }
    onCreate(applet: AppletEntry) {
        const entry = applet.entry;
        if (entry && entry.tabHeader) {
            const div = html('div', this.btnEnableInputHelper);
            div.className = 'app-menu-row';
            entry.tabHeader.append(div, this.bookmarks.root);
        }
    }
    getRoot() {
        return this.root;
    }
    serialize(data: any) {
        const ordinals: any[] = [];
        data.type = 'ordinal-enumerator';
        data.ordinalType = this.config.serialize();
        for (let h = this._first; h; h = h.next) {
            const ord: any = {};
            // const ord = {ordinal: this.config.stringify(h.ordinal), note: h.note, bookmark: h.bookmarkItem !== null};
            h.ordinalManager.serialize(ord);
            h.serialize(ord);
            ordinals.push(ord);
        }
        data.ordinals = ordinals;
        data.enableInputHelper = this.btnEnableInputHelper.classList.contains('selected');
    }
    loadData(data: any) {
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
    insertBefore(item: OrdinalExpanderItem<T>, newItem: OrdinalExpanderItem<T>) {
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
    append(item: OrdinalExpanderItem<T>) {
        if (this._last) {
            this._last.next = item;
            item.prev = this._last;
            item.next = null;
            this._last = item;
        } else {
            this._first = this._last = item;
            item.prev = item.next = null;
        }
        item.refreshListLevel();
        item.renderOrdinal();
    }
    removeLinks(item: OrdinalExpanderItem<T>) {
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
    select(item: OrdinalExpanderItem<T> | null) {
        if (this._selected && this._selected !== item) {
            this._selected.menu.hide();
        }
        if (item && this._selected !== item) {
            item.menu.show();
            this._selected = item;
        }
    }
}

export function deserializeOrdinalExpander(data: any) {
    if (data.ordinalType === '0y') {
        const ret = new OrdinalListExpander(new Y0SequenceOrdinalListExpander());
        ret.loadData(data);
        return ret;
    }
    return null;
}

export const enumeratorFactory: AppletFactory = {
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
    showMontagne = true;
    elemGap = 40;
    linkCellHeight = 20;
    fontSize = 20;
    paddingLeftRight = 10;
    serialize() {
        return '0y';
    }
    stringify(a: number[]) {
        return a.join(',');
    }
    createElement(elem: OrdinalExpanderItem<number[]>) {
        return new Y0SequenceOrdinalListExpanderElementManager(this, elem);
    }
    predecessor(a: number[]) {
        if (a[a.length - 1] === 1) {
            return a.slice(0, -1);
        } else return null;
    }
    compare(a: number[], b: number[]) {
        return lexicographicalCompareNumbers(a, b);
    }
    render(ord: number[]) {
        return document.createTextNode(ord.join(','));
    }
    expander(a: number[]) {
        return expandY0(y0Montagne(a));
    }
    parse(str: string) {
        return str.split(',').map(e => Number(e.trim()));
    }
}

function copyClass(to: DOMTokenList, from: DOMTokenList, cls: string) {
    to.toggle(cls, from.contains(cls));
}

export class Y0SequenceOrdinalListExpanderElementManager implements OrdinalEnumeratorElementManager<number[]> {
    btnShowOy = toggleButton('0-Y', () => this.ordinalElem.renderOrdinal());
    btnShowMontagne = toggleButton('M', () => this.ordinalElem.renderOrdinal());
    btnShowBMS = toggleButton('BMS', () => this.ordinalElem.renderOrdinal());
    btnShowBMSMatrix = toggleButton('BMS Mat', () => this.ordinalElem.renderOrdinal());
    constructor(public imageConfig: Y0MontagneImageConfig, public ordinalElem: OrdinalExpanderItem<number[]>) {
        this.btnShowOy.title = 'Show 0-Y';
        this.btnShowOy.classList.add('selected');
        this.btnShowMontagne.title = 'Show 0-Y montain';
        this.btnShowBMS.title = 'Show BMS';
        this.btnShowBMSMatrix.title = 'Show BMS matrix form';
        this.ordinalElem.menu.addExtraButton(
            this.btnShowOy,
            this.btnShowMontagne,
            this.btnShowBMS,
            this.btnShowBMSMatrix,
        );
    }
    createElement(elem: OrdinalExpanderItem<number[]>) {
        const ret = new Y0SequenceOrdinalListExpanderElementManager(this.imageConfig, elem);
        copyClass(ret.btnShowOy.classList, this.btnShowOy.classList, 'selected');
        copyClass(ret.btnShowBMS.classList, this.btnShowBMS.classList, 'selected');
        copyClass(ret.btnShowBMSMatrix.classList, this.btnShowBMSMatrix.classList, 'selected');
        copyClass(ret.btnShowMontagne.classList, this.btnShowMontagne.classList, 'selected');
        return ret;
    }
    serialize(data: any) {
        data.showM = this.btnShowMontagne.classList.contains('selected');
        data.show0y = this.btnShowOy.classList.contains('selected');
        data.showBMS = this.btnShowBMS.classList.contains('selected');
        data.showBMSMat = this.btnShowBMSMatrix.classList.contains('selected');
    }
    deserialize(data: any) {
        this.btnShowMontagne.classList.toggle('selected', !!data.showM);
        this.btnShowOy.classList.toggle('selected', !!data.show0y);
        this.btnShowBMS.classList.toggle('selected', !!data.showBMS);
        this.btnShowBMSMatrix.classList.toggle('selected', !!data.showBMSMat);
    }
    render(ordinal: number[], isCandidates: boolean) {
        const renderedOrdinals: Node[] = [];
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
