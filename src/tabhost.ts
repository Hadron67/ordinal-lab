/** @import { Tabpage } from './types/app' */

import { Tabpage } from "./types/app";

export class TabEntry {
    headerElem: HTMLLIElement;
    scrollY: number;
    tabHeader: Element | null = null;
    ondefocus: ((entry: TabEntry) => void)[] = [];
    onfocus: ((entry: TabEntry) => void)[] = [];
    onclose: ((entry: TabEntry) => void)[] = [];
    constructor(public host: TabHost, public page: Tabpage) {
        this.headerElem = document.createElement('li');
        this.headerElem.append(...page.getTitle());
        this.headerElem.addEventListener('click', () => {
            if (this.host.activeTab !== this) {
                this.select();
            }
        });
    }
    isFocused() {
        return this === this.host.activeTab;
    }
    getScrollY() {
        return this.isFocused() ? window.scrollY : this.scrollY;
    }
    select() {
        for (const tab of this.host.tabs) {
            tab.headerElem.classList.remove('selected');
        }
        this.headerElem.classList.add('selected');
        if (this.host.activeTab !== null) {
            this.host.activeTab.scrollY = window.scrollY;
            for (const a of this.host.activeTab.ondefocus) a(this);
            const activeHeader = this.host.activeTab.tabHeader;
            if (activeHeader) activeHeader.remove();
            this.host.activeTab = this;
            this.host.content.replaceChildren(this.page.getRoot());
            if (this.tabHeader) this.host.tabheader.appendChild(this.tabHeader);
        }
        for (const a of this.onfocus) a(this);
        window.scrollTo({top: this.scrollY});
    }
    close() {
        const id = this.host.tabs.indexOf(this);
        if (id >= 0) {
            for (const a of this.onclose) a(this);
            if (this.host.activeTab === this) {
                if (id > 0) {
                    this.host.tabs[id - 1].select();
                } else {
                    this.host.content.replaceChildren();
                    this.host.activeTab = null;
                }
            }
            this.headerElem.remove();
            this.host.tabs = this.host.tabs.filter(tab => tab !== this);
        }
    }
    renderTitle() {
        this.headerElem.replaceChildren(...this.page.getTitle());
    }
}

export class TabHost {
    activeTab: TabEntry | null = null;
    tabs: TabEntry[] = [];
    constructor(public tablist: Element, public tabheader: Element, public content: Element) {
    }
    createTab(page: Tabpage) {
        const ret = new TabEntry(this, page);
        page.onCreate(ret);
        return ret;
    }
    addTab(tab: TabEntry) {
        this.tabs.push(tab);
        this.tablist.appendChild(tab.headerElem);
        if (this.activeTab === null) {
            this.activeTab = tab;
            tab.select();
        }
        return tab;
    }
}
