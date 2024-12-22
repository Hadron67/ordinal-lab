/** @import { Tabpage } from './types/app' */

export class TabEntry {
    /**
     * @param {TabHost} host
     * @param {Tabpage} page
     */
    constructor(host, page) {
        /** @type {TabHost} */
        this.host = host;
        /** @type {Tabpage} */
        this.page = page;
        /** @type {HTMLLIElement} */
        this.headerElem = document.createElement('li');
        this.headerElem.append(...page.getTitle());
        this.headerElem.addEventListener('click', () => {
            if (this.host.activeTab !== this) {
                this.select();
            }
        });

        /** @type {Element | null} */
        this.tabHeader = null;

        /** @type {((entry: TabEntry) => void)[]} */
        this.ondefocus = [];
        /** @type {((entry: TabEntry) => void)[]} */
        this.onfocus = [];
        /** @type {((entry: TabEntry) => void)[]} */
        this.onclose = [];
    }
    isFocused() {
        return this === this.host.activeTab;
    }
    select() {
        for (const tab of this.host.tabs) {
            tab.headerElem.classList.remove('selected');
        }
        this.headerElem.classList.add('selected');
        if (this.host.activeTab !== null) {
            for (const a of this.host.activeTab.ondefocus) a(this);
            const activeHeader = this.host.activeTab.tabHeader;
            if (activeHeader) activeHeader.remove();
            this.host.activeTab = this;
            this.host.content.replaceChildren(this.page.getRoot());
            if (this.tabHeader) this.host.tabheader.appendChild(this.tabHeader);
        }
        for (const a of this.onfocus) a(this);
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
    /**
     * @param {Element} tablist
     * @param {Element} tabheader
     * @param {Element} content
     */
    constructor(tablist, tabheader, content) {
        /** @type {Element} */
        this.tablist = tablist;
        /** @type {Element} */
        this.tabheader = tabheader;
        /** @type {Element} */
        this.content = content;

        /** @type {TabEntry | null} */
        this.activeTab = null;

        /** @type {TabEntry[]} */
        this.tabs = [];
    }
    /**
     * @param {Tabpage} page
     */
    createTab(page) {
        const ret = new TabEntry(this, page);
        page.onCreate(ret);
        return ret;
    }
    /**
     * @param {TabEntry} tab
     */
    addTab(tab) {
        this.tabs.push(tab);
        this.tablist.appendChild(tab.headerElem);
        if (this.activeTab === null) {
            this.activeTab = tab;
            tab.select();
        }
        return tab;
    }
}
